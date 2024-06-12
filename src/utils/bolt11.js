import bolt11 from 'light-bolt11-decoder';

export const getBolt11Description = (bolt11) => {
  const decoded = bolt11.decode(bolt11);
  const descriptionSection = decoded.sections.find(section => section.tag === 'd');
  return descriptionSection ? descriptionSection.value : null;
}

export const getBolt11Amount = (inv) => {
  const decoded = bolt11.decode(inv);
  const amountSection = decoded.sections.find(section => section.name === 'amount');
  return amountSection ? amountSection.value / 1000 : null;
}

export const validateBolt11 = (inv) => {
  try {
    const decoded = bolt11.decode(inv);

    // Check if the invoice has expired
    const expiryTimestamp = decoded.sections.find(section => section.name === 'timestamp').value + decoded.expiry;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp > expiryTimestamp) {
      return { valid: false, reason: 'Invoice has expired' };
    }

    // Check if the invoice has a valid payment hash
    const paymentHash = decoded.sections.find(section => section.name === 'payment_hash').value;
    if (!paymentHash || paymentHash.length !== 64) {
      return { valid: false, reason: 'Invalid payment hash' };
    }

    // Check if the invoice has a valid amount
    const amountSection = decoded.sections.find(section => section.name === 'amount');
    if (!amountSection || isNaN(amountSection.value)) {
      return { valid: false, reason: 'Invalid amount' };
    }

    // Additional validation checks can be added here

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Invalid Bolt11 invoice' };
  }
}