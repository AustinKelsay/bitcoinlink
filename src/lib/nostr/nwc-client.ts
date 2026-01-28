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
    throw new Error(`NWC URL must start with nostr+walletconnect://, got: ${nwcUrl.substring(0, 30)}...`);
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

  // Pre-validate NWC URL with detailed error messages before calling snstr
  try {
    preValidateNwcUrl(nwcUrl);
  } catch (validationError) {
    // Re-throw with additional context
    throw new Error(`NWC URL validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
  }

  let client: NostrWalletConnectClient | null = null;

  try {
    const connectionOptions = parseNWCURL(nwcUrl);
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
    parseNWCURL(nwcUrl);
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
    const options = parseNWCURL(nwcUrl);
    return options.relays;
  } catch {
    return [];
  }
}
