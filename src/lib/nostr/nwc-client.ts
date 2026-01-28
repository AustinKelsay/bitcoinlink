/**
 * Browser-side NWC client for paying invoices
 */

import { NostrWalletConnectClient, parseNWCURL } from 'snstr';

/**
 * Result from a successful NWC payment.
 * Contains the preimage as proof of payment.
 */
export interface PaymentResult {
  /** The payment preimage (32 bytes hex-encoded) */
  preimage: string;
}

/**
 * Normalize an NWC URL to ensure relay URLs are properly URL-encoded.
 *
 * snstr's parseNWCURL uses `url.split("://")` which breaks when the relay
 * parameter contains `://` (e.g., `wss://relay.example.com`). This function
 * normalizes the URL by properly URL-encoding the relay parameter.
 *
 * @param nwcUrl - The NWC URL to normalize
 * @returns The normalized URL with properly encoded relay parameter
 */
export function normalizeNwcUrl(nwcUrl: string): string {
  if (!nwcUrl || typeof nwcUrl !== 'string') {
    return nwcUrl;
  }

  // Only process if it starts with the NWC protocol
  if (!nwcUrl.startsWith('nostr+walletconnect://')) {
    return nwcUrl;
  }

  // Find the first ? which separates pubkey from query string
  const questionMarkIndex = nwcUrl.indexOf('?');
  if (questionMarkIndex === -1) {
    return nwcUrl;
  }

  const prefix = nwcUrl.substring(0, questionMarkIndex + 1);
  const queryString = nwcUrl.substring(questionMarkIndex + 1);

  // Parse the query string manually to preserve the relay URL
  const params: Array<[string, string]> = [];
  const parts = queryString.split('&');

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) continue;

    const key = part.substring(0, eqIndex);
    let value = part.substring(eqIndex + 1);

    // Check if this is a relay parameter with an unencoded URL
    // An unencoded URL would contain "://" which means the value
    // and subsequent parts may need to be combined
    if (key === 'relay' && !value.includes('%3A%2F%2F') && !value.includes('%3a%2f%2f')) {
      // The relay value might be split across multiple parts
      // e.g., "relay=wss" + "//relay.com" from "relay=wss://relay.com"
      // We need to reconstruct the full URL

      // Look ahead to find where the relay URL ends (at the next known parameter or end)
      const knownParams = ['secret', 'relay', 'lud16'];
      let fullValue = value;

      // Keep joining parts until we find a known parameter
      while (i + 1 < parts.length) {
        const nextPart = parts[i + 1];
        const nextEqIndex = nextPart.indexOf('=');
        const nextKey = nextEqIndex !== -1 ? nextPart.substring(0, nextEqIndex) : '';

        if (knownParams.includes(nextKey)) {
          break;
        }

        // This part is continuation of the relay URL (was split by &)
        fullValue += '&' + parts[i + 1];
        i++;
      }

      // URL-encode the relay value
      value = encodeURIComponent(fullValue);
    }

    params.push([key, value]);
  }

  // Reconstruct the URL with properly encoded parameters
  const normalizedQuery = params.map(([k, v]) => `${k}=${v}`).join('&');
  return prefix + normalizedQuery;
}

/**
 * Pre-validate an NWC URL to provide better error messages.
 * This matches the logic of snstr's parseNWCURL but with more detailed errors.
 *
 * @param nwcUrl - The URL to validate
 * @throws Detailed error if validation fails
 */
function preValidateNwcUrl(nwcUrl: unknown): asserts nwcUrl is string {
  if (nwcUrl === undefined || nwcUrl === null) {
    throw new Error('NWC URL is undefined or null - this may indicate a decryption or data corruption issue');
  }
  
  if (typeof nwcUrl !== 'string') {
    throw new Error(`NWC URL must be a string, got ${typeof nwcUrl}`);
  }

  if (nwcUrl.trim().length === 0) {
    throw new Error('NWC URL is empty');
  }

  if (!nwcUrl.startsWith('nostr+walletconnect://')) {
    throw new Error("Invalid NWC URL format. Expected 'nostr+walletconnect://' prefix.");
  }

  const withoutProtocol = nwcUrl.slice('nostr+walletconnect://'.length);
  const questionMarkIndex = withoutProtocol.indexOf('?');
  
  if (questionMarkIndex === -1) {
    throw new Error('NWC URL missing query string (no ? found)');
  }

  const pubkey = withoutProtocol.substring(0, questionMarkIndex);
  const queryString = withoutProtocol.substring(questionMarkIndex + 1);

  if (!pubkey || pubkey.length === 0) {
    throw new Error('NWC URL missing pubkey');
  }

  if (!/^[a-f0-9]{64}$/i.test(pubkey)) {
    throw new Error(`NWC URL pubkey is not valid 64-char hex: ${pubkey.substring(0, 20)}...`);
  }

  if (!queryString || queryString.length === 0) {
    throw new Error('NWC URL has empty query string');
  }

  const params = new URLSearchParams(queryString);
  const relay = params.get('relay');
  const secret = params.get('secret');

  if (!relay) {
    throw new Error('NWC URL missing relay parameter');
  }

  if (!secret) {
    // Provide detailed debugging info
    const allParams = Array.from(params.entries());
    throw new Error(
      `NWC URL missing secret parameter. ` +
      `Query string: "${queryString.substring(0, 100)}...", ` +
      `Parsed params: [${allParams.map(([k]) => k).join(', ')}]`
    );
  }
  // Note: snstr's parseNWCURL doesn't require a minimum secret length,
  // so we only check that it exists (for parity with snstr)
}

/**
 * Pay a Lightning invoice using NWC.
 * This function is designed to be used in the browser.
 *
 * @param nwcUrl - The nostr+walletconnect:// URL
 * @param invoice - The BOLT11 invoice to pay
 * @returns The payment result containing the preimage
 * @throws If payment fails or times out
 */
export async function payInvoiceWithNWC(
  nwcUrl: string,
  invoice: string
): Promise<PaymentResult> {
  // Fail fast on empty or invalid invoice
  if (!invoice || typeof invoice !== 'string' || invoice.trim().length === 0) {
    throw new Error('Invalid invoice: invoice must be a non-empty string');
  }

  // Normalize the NWC URL to handle unencoded relay URLs
  // This fixes the "Missing secret in NWC URL" error caused by snstr's
  // parseNWCURL splitting on "://" which breaks with wss:// relay URLs
  const normalizedUrl = normalizeNwcUrl(nwcUrl);

  // Pre-validate NWC URL with detailed error messages before calling snstr
  try {
    preValidateNwcUrl(normalizedUrl);
  } catch (validationError) {
    // Re-throw with additional context
    throw new Error(`NWC URL validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
  }

  let client: NostrWalletConnectClient | null = null;

  try {
    const connectionOptions = parseNWCURL(normalizedUrl);
    client = new NostrWalletConnectClient(connectionOptions);

    await client.init();
    const result = await client.payInvoice(invoice);

    if (!result || !result.preimage) {
      throw new Error('Payment failed: no preimage returned');
    }

    return { preimage: result.preimage };
  } finally {
    if (client) {
      try {
        await client.disconnect();
      } catch (disconnectError) {
        // Log but don't throw - disconnect errors shouldn't overwrite successful payment results
        console.warn('Error disconnecting NWC client:', disconnectError);
      }
    }
  }
}

/**
 * Validate an NWC URL format.
 *
 * @param nwcUrl - The URL to validate
 * @returns True if the URL is valid
 */
export function isValidNWCUrl(nwcUrl: string): boolean {
  try {
    const normalized = normalizeNwcUrl(nwcUrl);
    parseNWCURL(normalized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract relay URLs from an NWC URL.
 *
 * @param nwcUrl - The NWC URL
 * @returns Array of relay URLs
 */
export function getRelaysFromNWCUrl(nwcUrl: string): string[] {
  try {
    const normalized = normalizeNwcUrl(nwcUrl);
    const options = parseNWCURL(normalized);
    return options.relays;
  } catch {
    return [];
  }
}
