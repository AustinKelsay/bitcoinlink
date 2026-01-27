# Nostr Protocol in BitcoinLink

## Overview

BitcoinLink uses Nostr as its **primary storage and communication layer**. Instead of a database, all link data is stored as encrypted events on Nostr relays.

**Core Nostr Usage:**

| NIP | Purpose in BitcoinLink |
|-----|------------------------|
| NIP-17 | Gift Wrap - encrypts NWC credentials in events |
| NIP-44 | Encryption algorithm used by gift wrap |
| NIP-47 | Nostr Wallet Connect - payment execution |
| NIP-09 | Deletion events - tracks claimed links |
| NIP-04 | Legacy encryption for Mutiny NWA flow |

---

## NIP-17: Gift Wrap (Core Feature)

Gift wrap is the foundation of BitcoinLink's security model. It provides multi-layer encryption with metadata hiding.

### Structure

```text
┌─────────────────────────────────────────┐
│ Gift Wrap (Kind 1059)                   │
│ - pubkey: EPHEMERAL (random)            │
│ - content: NIP-44 encrypted seal        │
│ - tags: [["p", receiver_pubkey]]        │
├─────────────────────────────────────────┤
│ Seal (Kind 13) - inside gift wrap       │
│ - pubkey: real sender (ephemeral too)   │
│ - content: NIP-44 encrypted rumor       │
│ - signed by sender                      │
├─────────────────────────────────────────┤
│ Rumor (Kind 14) - inside seal           │
│ - pubkey: real sender                   │
│ - content: BitcoinLink payload JSON     │
│ - NOT signed (unsigned event)           │
└─────────────────────────────────────────┘
```

### BitcoinLink Payload

Inside the rumor's content:
```json
{
  "type": "bitcoinlink",
  "nwcUrl": "nostr+walletconnect://...",
  "amount": 1000
}
```

### Usage in Code

**Creating a link (src/lib/nostr/gift-wrap.ts):**
```typescript
import { createDirectMessage, generateKeypair, GIFT_WRAP_KIND } from 'snstr';
import type { BitcoinLinkPayload, BitcoinLinkResult } from './types';

export async function createBitcoinLink(
  payload: BitcoinLinkPayload
): Promise<BitcoinLinkResult> {
  const receiver = await generateKeypair();  // Private key goes in URL
  const sender = await generateKeypair();    // Ephemeral, discarded

  const giftWrap = await createDirectMessage(
    JSON.stringify(payload),
    sender.privateKey,
    receiver.publicKey
  );

  return {
    giftWrap,
    receiverPrivateKey: receiver.privateKey,
    receiverPublicKey: receiver.publicKey,
  };
}
```

**Decrypting a link:**
```typescript
import { decryptDirectMessage, GIFT_WRAP_KIND } from 'snstr';

export function decryptBitcoinLink(
  giftWrap: NostrEvent,
  receiverPrivateKey: string
): BitcoinLinkPayload {
  if (giftWrap.kind !== GIFT_WRAP_KIND) {
    throw new Error(`Invalid event kind: expected ${GIFT_WRAP_KIND}, got ${giftWrap.kind}`);
  }

  const rumor = decryptDirectMessage(giftWrap, receiverPrivateKey);
  const payload = JSON.parse(rumor.content);
  
  validatePayload(payload);  // Throws on invalid structure
  return payload;
}
```

---

## NIP-47: Nostr Wallet Connect

NWC enables the app to send payments from the sender's wallet.

### NWC URL Format

```text
nostr+walletconnect://{walletPubkey}?relay={relayUrl}&secret={clientSecret}
```

### Usage in BitcoinLink

**Creating NWC connection (Alby flow in index.tsx):**
```typescript
import { nwc } from '@getalby/sdk';

const newNwc = nwc.NWCClient.withNewSecret();
await newNwc.initNWC({
  name: 'bitcoinlink.app',
  requestMethods: ['pay_invoice'],
  maxAmount: numberOfLinks * satsPerLink,
  budgetRenewal: 'never',
  expiresAt: yearFromNow,
});
const nwcUrl = newNwc.getNostrWalletConnectUrl();
```

**Paying an invoice (src/lib/nostr/nwc-client.ts):**
```typescript
import { NostrWalletConnectClient, parseNWCURL } from 'snstr';

export interface PaymentResult {
  preimage: string;
}

export async function payInvoiceWithNWC(
  nwcUrl: string,
  invoice: string
): Promise<PaymentResult> {
  const connectionOptions = parseNWCURL(nwcUrl);
  const client = new NostrWalletConnectClient(connectionOptions);

  try {
    await client.init();
    const result = await client.payInvoice(invoice);
    
    if (!result || !result.preimage) {
      throw new Error('Payment failed: no preimage returned');
    }
    
    return { preimage: result.preimage };
  } finally {
    await client.disconnect();
  }
}
```

---

## NIP-09: Deletion Events

Deletion events mark links as claimed. When a payment succeeds, a deletion event is published.

### How It Works

```text
┌─────────────────────────────────────────┐
│ Before Claim:                           │
│ - Gift wrap event exists on relays      │
│ - No deletion event                     │
├─────────────────────────────────────────┤
│ After Claim:                            │
│ - Gift wrap event still exists          │
│ - Deletion event (kind 5) published     │
│ - App checks for deletion to show       │
│   "already claimed" status              │
└─────────────────────────────────────────┘
```

### Usage in Code

**Publishing deletion (src/lib/nostr/client.ts):**
```typescript
async publishDeletion(eventId: string, privateKey: string): Promise<void> {
  const { createDeletionRequest, getPublicKey, signEvent, getEventHash } =
    await import('snstr');

  const pubkey = getPublicKey(privateKey);
  const unsignedEvent = createDeletionRequest(
    { ids: [eventId], content: 'Link claimed' },
    pubkey
  );

  const id = await getEventHash(unsignedEvent);
  const sig = await signEvent(id, privateKey);

  await this.client.publishEvent({ ...unsignedEvent, id, sig });
}
```

**Checking if claimed:**
```typescript
async hasDeletionEvent(eventId: string, receiverPubkey: string): Promise<boolean> {
  return new Promise((resolve) => {
    const subIds = this.client.subscribe(
      [{ kinds: [5], authors: [receiverPubkey], '#e': [eventId] }],
      () => resolve(true)
    );

    setTimeout(() => {
      this.client.unsubscribe(subIds);
      resolve(false);
    }, 5000);
  });
}
```

---

## NIP-04: Legacy Encryption (Mutiny NWA)

Used only for Mutiny wallet authentication via NWA (Nostr Wallet Auth).

### NWA Flow

```text
1. App generates keypair
2. App creates NWA URI: nostr+walletauth://{pubkey}?relay=...&secret=...&budget=...
3. User scans QR or opens Mutiny in browser
4. Mutiny publishes kind 33194 event with NIP-04 encrypted response
5. App decrypts to get NWC connection details
```

### Code Example (MutinyModal.tsx)

```typescript
import { nip04Decrypt } from 'snstr';

// Subscribe to NWA response events (kind 33194)
subscribeToEvents([{
  kinds: [33194],
  since: Math.round(Date.now() / 1000),
  '#d': [appPublicKey]
}]);

// When event received, decrypt using NIP-04
const decrypted = await nip04Decrypt(appPrivKey, event.pubkey, event.content);
const { secret } = JSON.parse(decrypted);

// Construct NWC URL from response
const nwcUri = `nostr+walletconnect://${event.pubkey}?relay=${relayUrl}&secret=${secret}`;
```

---

## Relay Management

### Default Relays

```typescript
// src/lib/nostr/relays.ts
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://nostr.mutinywallet.com'
];
```

### Client Implementation

```typescript
// src/lib/nostr/client.ts
export class BitcoinLinkNostrClient {
  private client: Nostr;

  constructor(relays: string[] = DEFAULT_RELAYS) {
    this.client = new Nostr(relays);
  }

  async connect(): Promise<void> {
    await this.client.connectToRelays();
  }

  async publish(event: NostrEvent): Promise<void> {
    await this.client.publishEvent(event);
  }

  async fetchEvent(eventId: string): Promise<NostrEvent | null> {
    // Subscribe and wait for event
  }

  close(): void {
    this.client.disconnectFromRelays();
  }
}
```

---

## Event Kinds Used

| Kind | Name | Purpose |
|------|------|---------|
| 1059 | Gift Wrap | Stores encrypted link payload |
| 5 | Deletion | Marks link as claimed |
| 33194 | NWA Info | Mutiny wallet auth response |

---

## Security Properties

### What Gift Wrap Provides
- **Content encryption**: NWC URL only readable with receiver private key
- **Metadata hiding**: Ephemeral pubkeys hide sender identity
- **Timestamp obfuscation**: Randomized up to 2 days

### What Deletion Provides
- **Claim tracking**: Public record that link was used
- **Double-claim prevention**: Apps check for deletion before showing claim UI

### What's in the URL
- **Event ID**: Points to gift wrap on relays
- **Receiver Private Key**: Required to decrypt
- **Relays**: Where to find the event
- **Amount**: Display only (real amount in payload)
