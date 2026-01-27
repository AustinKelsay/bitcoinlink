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
