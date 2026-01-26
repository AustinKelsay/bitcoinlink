# Utility Functions Documentation

## Overview

BitcoinLink utility functions handle Bolt11 Lightning invoice parsing and validation.

## bolt11.js

**Location:** `src/utils/bolt11.js`

### Dependencies

```javascript
import bolt11 from 'light-bolt11-decoder';
```

Uses the `light-bolt11-decoder` library for parsing Lightning Network invoices.

---

### getBolt11Description

Extracts the description field from a Bolt11 invoice.

```javascript
export const getBolt11Description = (bolt11) => {
  const decoded = bolt11.decode(bolt11);
  const descriptionSection = decoded.sections.find(
    section => section.tag === 'd'
  );
  return descriptionSection ? descriptionSection.value : null;
}
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `bolt11` | string | Bolt11 encoded invoice string |

**Returns:** `string | null` - Invoice description or null if not present

**Usage:**
```javascript
const description = getBolt11Description('lnbc10u1p...');
// Returns: "Payment for coffee" or null
```

---

### getBolt11Amount

Extracts the amount in satoshis from a Bolt11 invoice.

```javascript
export const getBolt11Amount = (inv) => {
  const decoded = bolt11.decode(inv);
  const amountSection = decoded.sections.find(
    section => section.name === 'amount'
  );
  return amountSection ? amountSection.value / 1000 : null;
}
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `inv` | string | Bolt11 encoded invoice string |

**Returns:** `number | null` - Amount in satoshis or null if not present

**Note:** The decoder returns amount in millisatoshis, so we divide by 1000.

**Usage:**
```javascript
const amount = getBolt11Amount('lnbc10u1p...');
// Returns: 1000 (satoshis)
```

---

### validateBolt11

Validates a Bolt11 invoice for correctness and expiration.

```javascript
export const validateBolt11 = (inv) => {
  try {
    const decoded = bolt11.decode(inv);

    // Check if the invoice has expired
    const expiryTimestamp = decoded.sections.find(
      section => section.name === 'timestamp'
    ).value + decoded.expiry;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp > expiryTimestamp) {
      return { valid: false, reason: 'Invoice has expired' };
    }

    // Check if the invoice has a valid payment hash
    const paymentHash = decoded.sections.find(
      section => section.name === 'payment_hash'
    ).value;
    if (!paymentHash || paymentHash.length !== 64) {
      return { valid: false, reason: 'Invalid payment hash' };
    }

    // Check if the invoice has a valid amount
    const amountSection = decoded.sections.find(
      section => section.name === 'amount'
    );
    if (!amountSection || isNaN(amountSection.value)) {
      return { valid: false, reason: 'Invalid amount' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Invalid Bolt11 invoice' };
  }
}
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `inv` | string | Bolt11 encoded invoice string |

**Returns:**
```typescript
{
  valid: boolean;
  reason?: string;  // Only present if valid is false
}
```

**Validation Checks:**
1. **Expiration:** Invoice timestamp + expiry vs current time
2. **Payment Hash:** Must exist and be 64 characters (hex)
3. **Amount:** Must exist and be a valid number
4. **Format:** Must be decodable as Bolt11

**Usage:**
```javascript
const result = validateBolt11('lnbc10u1p...');

if (result.valid) {
  // Proceed with payment
} else {
  console.error(result.reason);
  // "Invoice has expired"
  // "Invalid payment hash"
  // "Invalid amount"
  // "Invalid Bolt11 invoice"
}
```

---

## Bolt11 Invoice Structure

A decoded Bolt11 invoice contains sections:

| Section Name | Tag | Description |
|--------------|-----|-------------|
| `timestamp` | - | Invoice creation time (Unix) |
| `payment_hash` | `p` | 32-byte payment hash (hex) |
| `amount` | - | Payment amount (millisatoshis) |
| `description` | `d` | Human-readable description |
| `expiry` | `x` | Seconds until expiration |
| `payee` | `n` | Payee public key |

## Usage in BitcoinLink

### Claim Page Validation

The claim page validates user-provided invoices:

```javascript
// src/pages/claim/[slug].js
import { validateBolt11 } from '@/utils/bolt11';

if (input.toLowerCase().startsWith('lnbc')) {
  const valid = validateBolt11(input);
  if (!valid) {
    showToast('warn', 'Invalid Invoice', 'This is not a valid invoice.');
    return false;
  }
  return { type: 'invoice', data: input };
}
```

### API Amount Verification

The claim API verifies invoice amounts match expected values:

```javascript
// src/pages/api/claim/[slug].js
import { getBolt11Amount } from '@/utils/bolt11';

const amountPerLink = nwc.maxAmount / nwc.numLinks;
const bolt11Amount = getBolt11Amount(invoice);

if (bolt11Amount !== amountPerLink) {
  return res.status(400).json({ error: 'Invalid invoice amount' });
}
```
