import bolt11Decoder from 'light-bolt11-decoder';

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export const getBolt11Description = (invoice: string): string | null => {
  const decoded = bolt11Decoder.decode(invoice);
  const descriptionSection = decoded.sections.find(
    (section) => section.tag === 'd'
  );
  return descriptionSection ? String(descriptionSection.value) : null;
};

export const getBolt11Amount = (invoice: string): number | null => {
  const decoded = bolt11Decoder.decode(invoice) ;
  const amountSection = decoded.sections.find(
    (section) => section.name === 'amount'
  );
  return amountSection ? Number(amountSection.value) / 1000 : null;
};

export const validateBolt11 = (invoice: string): ValidationResult => {
  try {
    const decoded = bolt11Decoder.decode(invoice) ;

    // Check if the invoice has expired
    const timestampSection = decoded.sections.find(
      (section) => section.name === 'timestamp'
    );
    if (!timestampSection) {
      return { valid: false, reason: 'Missing timestamp' };
    }
    const expiryTimestamp = Number(timestampSection.value) + decoded.expiry;
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
