# Utilities Documentation

## Overview

BitcoinLink has a minimal set of utility functions, primarily for Bolt11 invoice parsing. The main utilities are now in `src/lib/nostr/` for Nostr-related functionality.

---

## src/utils/bolt11.ts

Bolt11 Lightning invoice validation utility.

### validateBolt11

Validates a Bolt11 invoice format and checks for expiration.

```typescript
import decode from 'light-bolt11-decoder';

export function validateBolt11(invoice: string): {
  valid: boolean;
  reason?: string;
} {
  try {
    const decoded = decode(invoice);

    // Check if the invoice has expired
    const timestampSection = decoded.sections.find(
      (section) => section.name === 'timestamp'
    );
    const timestamp = timestampSection?.value;
    const expiry = decoded.expiry || 3600;

    if (timestamp && Date.now() / 1000 > timestamp + expiry) {
      return { valid: false, reason: 'Invoice has expired' };
    }

    // Check for valid payment hash
    const paymentHash = decoded.sections.find(
      (section) => section.name === 'payment_hash'
    )?.value;

    if (!paymentHash || paymentHash.length !== 64) {
      return { valid: false, reason: 'Invalid payment hash' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Invalid Bolt11 invoice' };
  }
}
```

### Usage

```typescript
import { validateBolt11 } from '@/utils/bolt11';

const result = validateBolt11('lnbc1000n1pj...');

if (result.valid) {
  // Proceed with payment
} else {
  console.error(result.reason);
  // "Invoice has expired"
  // "Invalid payment hash"
  // "Invalid Bolt11 invoice"
}
```

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `valid` | `boolean` | Whether invoice is valid |
| `reason` | `string \| undefined` | Error reason if invalid |

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

**createClaimUrl(eventId, receiverPrivateKey, amountSats, relays): string**

Creates a full claim URL.

```typescript
import { createClaimUrl } from '@/lib/nostr';

const url = createClaimUrl(
  'abc123',
  'def456',
  1000,
  ['wss://relay.damus.io']
);
// Returns: https://bitcoinlink.app/claim/{encoded}
```

**createClaimPath(eventId, receiverPrivateKey, amountSats, relays): string**

Creates a relative claim path (without domain).

```typescript
import { createClaimPath } from '@/lib/nostr';

const path = createClaimPath('abc123', 'def456', 1000);
// Returns: /claim/{encoded}
```

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
