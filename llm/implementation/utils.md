# Utilities Documentation

## Overview

BitcoinLink has a minimal set of utility functions, primarily for Bolt11 invoice parsing. The main utilities are now in `src/lib/nostr/` for Nostr-related functionality.

---

## src/utils/bolt11.ts

Bolt11 Lightning invoice utilities for parsing, validating, and extracting data.

### validateBolt11

Validates a Bolt11 invoice format, expiration, payment hash, and amount.

```typescript
import bolt11Decoder from 'light-bolt11-decoder';

export const validateBolt11 = (invoice: string): ValidationResult => {
  try {
    const decoded = bolt11Decoder.decode(invoice);

    // Check timestamp
    const timestampSection = decoded.sections.find(
      (section) => section.name === 'timestamp'
    );
    if (!timestampSection) {
      return { valid: false, reason: 'Missing timestamp' };
    }
    
    // Check expiration
    const expiryTimestamp = Number(timestampSection.value) + decoded.expiry;
    if (Math.floor(Date.now() / 1000) > expiryTimestamp) {
      return { valid: false, reason: 'Invoice has expired' };
    }

    // Check payment hash (must be 64-char hex)
    const paymentHashSection = decoded.sections.find(
      (section) => section.name === 'payment_hash'
    );
    if (!paymentHashSection || String(paymentHashSection.value).length !== 64) {
      return { valid: false, reason: 'Invalid payment hash' };
    }

    // Check amount
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
```

### getBolt11Description

Extracts the description from a Bolt11 invoice.

```typescript
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
```

### getBolt11Amount

Extracts the amount in satoshis from a Bolt11 invoice.

```typescript
export const getBolt11Amount = (invoice: string): number | null => {
  try {
    const decoded = bolt11Decoder.decode(invoice);
    const amountSection = decoded.sections.find(
      (section) => section.name === 'amount'
    );
    // BOLT11 amount is in millisatoshis
    return amountSection ? Number(amountSection.value) / 1000 : null;
  } catch {
    return null;
  }
};
```

### Usage

```typescript
import { validateBolt11, getBolt11Amount, getBolt11Description } from '@/utils/bolt11';

const invoice = 'lnbc1000n1pj...';
const result = validateBolt11(invoice);

if (result.valid) {
  const amount = getBolt11Amount(invoice);   // sats
  const desc = getBolt11Description(invoice); // string or null
} else {
  console.error(result.reason);
  // "Missing timestamp"
  // "Invoice has expired"
  // "Invalid payment hash"
  // "Invalid amount"
  // "Invalid Bolt11 invoice"
}
```

### Types

```typescript
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}
```

---

## src/lib/nostr/ (Nostr Utilities)

The core utilities are in the Nostr library modules.

### link-encoder.ts

URL encoding/decoding utilities using base64url.

**encodeLink(link: EncodedLink): string**

Encodes link data to URL-safe base64.

```typescript
import { encodeLink } from '@/lib/nostr';

const encoded = encodeLink({
  eventId: 'abc123...',
  receiverPrivateKey: 'def456...',
  relays: ['wss://relay.damus.io'],
  amountSats: 1000,
});
// Returns: base64url string without padding
```

**decodeLink(encoded: string): EncodedLink**

Decodes base64url string back to link data.

```typescript
import { decodeLink } from '@/lib/nostr';

const data = decodeLink('eyJldmVudElkIjo...');
// Returns: { eventId, receiverPrivateKey, relays, amountSats }
```

**createClaimUrl(eventId, receiverPrivateKey, amountSats, relays?): string**

Creates a full claim URL.

```typescript
import { createClaimUrl } from '@/lib/nostr';

const url = createClaimUrl(
  'abc123...',        // event ID
  'def456...',        // receiver private key
  1000,               // amount in sats
  ['wss://relay.damus.io', ...]  // optional, defaults to DEFAULT_RELAYS
);
// Returns: https://bitcoinlink.app/claim/{base64url_encoded}
```

**createClaimPath(eventId, receiverPrivateKey, amountSats, relays?): string**

Creates a relative claim path (without domain).

```typescript
import { createClaimPath } from '@/lib/nostr';

const path = createClaimPath('abc123...', 'def456...', 1000);
// Returns: /claim/{base64url_encoded}
```

---

### link-generator.ts

Shared link generation utility used by both the home page and MutinyModal.

**generateLinksFromNWC(options): Promise<string[]>**

Generates multiple Bitcoin Links from an NWC URL.

```typescript
import { generateLinksFromNWC } from '@/lib/nostr';

const links = await generateLinksFromNWC({
  nwcUrl: 'nostr+walletconnect://...',
  numberOfLinks: 5,
  satsPerLink: 1000,
  relays: ['wss://relay.damus.io']  // optional
});
// Returns: ['https://bitcoinlink.app/claim/...', ...]
```

**Options:**

| Property | Type | Description |
|----------|------|-------------|
| `nwcUrl` | `string` | The NWC URL to embed in each link |
| `numberOfLinks` | `number` | Number of links to generate (min: 1) |
| `satsPerLink` | `number` | Amount in satoshis per link (min: 1) |
| `relays` | `string[]` | Optional custom relays (uses DEFAULT_RELAYS if not provided) |

---

### nwc-client.ts

NWC payment utilities.

**payInvoiceWithNWC(nwcUrl, invoice): Promise<PaymentResult>**

Pays a Bolt11 invoice using NWC.

```typescript
import { payInvoiceWithNWC } from '@/lib/nostr';

const result = await payInvoiceWithNWC(
  'nostr+walletconnect://...',
  'lnbc1000n1pj...'
);
console.log('Preimage:', result.preimage);
```

**isValidNWCUrl(nwcUrl: string): boolean**

Validates NWC URL format.

```typescript
import { isValidNWCUrl } from '@/lib/nostr';

if (isValidNWCUrl(nwcUrl)) {
  // Valid NWC URL
}
```

**getRelaysFromNWCUrl(nwcUrl: string): string[]**

Extracts relay URLs from NWC URL.

```typescript
import { getRelaysFromNWCUrl } from '@/lib/nostr';

const relays = getRelaysFromNWCUrl('nostr+walletconnect://...');
// Returns: ['wss://relay.damus.io']
```

---

### gift-wrap.ts

Gift wrap utilities for link encryption.

**createBitcoinLink(payload): Promise<BitcoinLinkResult>**

Creates a gift-wrapped Bitcoin link.

```typescript
import { createBitcoinLink } from '@/lib/nostr';

const result = await createBitcoinLink({
  type: 'bitcoinlink',
  nwcUrl: 'nostr+walletconnect://...',
  amount: 1000,
});

// result.giftWrap - the Nostr event to publish
// result.receiverPrivateKey - goes in the URL
// result.receiverPublicKey - the event's p-tag recipient
```

**decryptBitcoinLink(giftWrap, receiverPrivateKey): BitcoinLinkPayload**

Decrypts a gift-wrapped event.

```typescript
import { decryptBitcoinLink } from '@/lib/nostr';

const payload = decryptBitcoinLink(event, privateKey);
// payload.nwcUrl - the NWC URL for payment
// payload.amount - satoshis
```

---

## External Utilities Used

### bech32

LNURL decoding in claim page.

```typescript
import { bech32 } from 'bech32';

const decodeLnurl = (lnurl: string): string | undefined => {
  try {
    const { words: dataPart } = bech32.decode(lnurl, 2000);
    const requestByteArray = bech32.fromWords(dataPart);
    return new TextDecoder().decode(Uint8Array.from(requestByteArray));
  } catch {
    return undefined;
  }
};
```

### snstr

All Nostr cryptographic utilities.

```typescript
import {
  generateKeypair,
  getPublicKey,
  createDirectMessage,
  decryptDirectMessage,
  createDeletionRequest,
  getEventHash,
  signEvent,
  parseNWCURL,
  NostrWalletConnectClient,
  GIFT_WRAP_KIND,
  decryptNIP04,
} from 'snstr';
```

---

## Type Definitions

**src/lib/nostr/types.ts:**

```typescript
export interface BitcoinLinkPayload {
  type: 'bitcoinlink';
  nwcUrl: string;
  amount: number; // sats
}

export interface BitcoinLinkResult {
  giftWrap: NostrEvent;
  receiverPrivateKey: string;
  receiverPublicKey: string;
}

export interface EncodedLink {
  eventId: string;
  receiverPrivateKey: string;
  relays: string[];
  amountSats: number;
}

export interface LinkInfo {
  amount: number;
  isClaimed: boolean;
}

export interface ParsedInput {
  type: 'lnurl' | 'invoice' | 'address';
  data: string;
}

export interface WebLN {
  enable: () => Promise<void>;
  makeInvoice: (args: { amount: number; comment: string }) =>
    Promise<{ paymentRequest: string }>;
}
```

---

## Usage in Claim Page

The claim page validates user input before processing:

```typescript
// src/pages/claim/[slug].tsx
import { validateBolt11 } from '@/utils/bolt11';

const parseLightningAddress = (input: string): ParsedInput | false => {
  // LNURL validation
  if (input.toLowerCase().startsWith('lnurl')) {
    const decoded = decodeLnurl(input);
    if (!decoded) return false;
    return { type: 'lnurl', data: decoded };
  }

  // Bolt11 invoice validation
  if (input.toLowerCase().startsWith('lnbc')) {
    const result = validateBolt11(input);
    if (!result.valid) {
      showToast('warn', 'Invalid Invoice', result.reason || 'Invalid invoice');
      return false;
    }
    return { type: 'invoice', data: input };
  }

  // Lightning address validation
  const [username, domain] = input.split('@');
  if (username && domain && domain.includes('.')) {
    return { type: 'address', data: input };
  }

  return false;
};
```
