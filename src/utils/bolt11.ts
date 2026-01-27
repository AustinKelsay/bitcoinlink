/**
 * BOLT11 Lightning invoice utilities.
 * Provides functions for parsing, validating, and extracting data from BOLT11 invoices.
 */

import bolt11Decoder from 'light-bolt11-decoder';

/**
 * Result of validating a BOLT11 invoice.
 */
export interface ValidationResult {
  /** Whether the invoice is valid */
  valid: boolean;
  /** Reason for validation failure (only present when valid is false) */
  reason?: string;
}

/**
 * Extract the description from a BOLT11 invoice.
 *
 * @param invoice - The BOLT11 invoice string
 * @returns The description string, or null if not present or invalid
 */
export const getBolt11Description = (invoice: string): string | null => {
  try {
    const decoded = bolt11Decoder.decode(invoice);
    const descriptionSection = decoded.sections.find(
      (section) => section.tag === 'd'
    );
    return descriptionSection ? String(descriptionSection.value) : null;
  } catch {
    return null;
  }
};

/**
 * Extract the amount in satoshis from a BOLT11 invoice.
 *
 * @param invoice - The BOLT11 invoice string
 * @returns The amount in satoshis, or null if not present or invalid
 */
export const getBolt11Amount = (invoice: string): number | null => {
  try {
    const decoded = bolt11Decoder.decode(invoice);
    const amountSection = decoded.sections.find(
      (section) => section.name === 'amount'
    );
    // Amount in BOLT11 is in millisatoshis, convert to satoshis
    return amountSection ? Number(amountSection.value) / 1000 : null;
  } catch {
    return null;
  }
};

/**
 * Validate a BOLT11 invoice.
 * Checks for valid structure, unexpired timestamp, valid payment hash, and valid amount.
 *
 * @param invoice - The BOLT11 invoice string to validate
 * @returns Validation result with valid flag and optional reason
 */
export const validateBolt11 = (invoice: string): ValidationResult => {
  try {
    const decoded = bolt11Decoder.decode(invoice);

    // Check if the invoice has expired
    const timestampSection = decoded.sections.find(
      (section) => section.name === 'timestamp'
    );
    if (!timestampSection) {
      return { valid: false, reason: 'Missing timestamp' };
    }
    // Default expiry to 3600 seconds per BOLT11 spec if not specified
    const expiryTimestamp = Number(timestampSection.value) + (decoded.expiry ?? 3600);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp > expiryTimestamp) {
      return { valid: false, reason: 'Invoice has expired' };
    }

    // Check if the invoice has a valid payment hash
    const paymentHashSection = decoded.sections.find(
      (section) => section.name === 'payment_hash'
    );
    const paymentHash = paymentHashSection?.value;
    if (!paymentHash || String(paymentHash).length !== 64) {
      return { valid: false, reason: 'Invalid payment hash' };
    }

    // Check if the invoice has a valid amount
    const amountSection = decoded.sections.find(
      (section) => section.name === 'amount'
    );
    if (!amountSection || isNaN(Number(amountSection.value))) {
      return { valid: false, reason: 'Invalid amount' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid Bolt11 invoice' };
  }
};
