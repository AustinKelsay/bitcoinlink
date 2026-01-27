# NIP-17: Gift Wrap - snstr Implementation

Direct messaging with gift wrap using NIP-44 encryption and NIP-59 wrapping.

## Overview

NIP-17 provides encrypted direct messaging with metadata protection:
- **Kind 1059**: Gift Wrap - outer envelope with ephemeral pubkey
- **Kind 13**: Seal - encrypted inner envelope
- **Kind 14**: Rumor - the actual message (unsigned)

## Event Layers

```
┌─────────────────────────────────────────┐
│ Gift Wrap (Kind 1059)                   │
│ - pubkey: ephemeral (random)            │
│ - content: NIP-44 encrypted seal        │
│ - tags: [["p", receiver]]               │
├─────────────────────────────────────────┤
│ Seal (Kind 13) - inside gift wrap       │
│ - pubkey: real sender                   │
│ - content: NIP-44 encrypted rumor       │
│ - signed by sender                      │
├─────────────────────────────────────────┤
│ Rumor (Kind 14) - inside seal           │
│ - pubkey: real sender                   │
│ - content: actual message               │
│ - NOT signed (unsigned event)           │
└─────────────────────────────────────────┘
```

## API

### createDirectMessage

```typescript
import { createDirectMessage } from 'snstr';

const giftWrap = await createDirectMessage(
  message,           // The message content (string)
  senderPrivateKey,  // Sender's private key (hex)
  receiverPublicKey  // Receiver's public key (hex)
);
// Returns: NostrEvent (kind 1059)
```

**What happens internally:**
1. Creates unsigned rumor (kind 14) with message
2. Encrypts rumor → seal (kind 13), signed by sender
3. Generates ephemeral keypair
4. Encrypts seal → gift wrap (kind 1059), signed by ephemeral key

### decryptDirectMessage

```typescript
import { decryptDirectMessage } from 'snstr';

const rumor = decryptDirectMessage(
  giftWrap,            // The kind 1059 event
  receiverPrivateKey   // Receiver's private key (hex)
);
// Returns: UnsignedEvent (the inner rumor)
// rumor.content = original message
// rumor.pubkey = real sender's pubkey
```

**What happens internally:**
1. Decrypts gift wrap content → seal
2. Verifies seal signature
3. Decrypts seal content → rumor
4. Verifies pubkey consistency

## Constants

```typescript
import { 
  GIFT_WRAP_KIND,  // 1059
  SEAL_KIND,       // 13
  DM_KIND,         // 14
  FILE_KIND        // 15
} from 'snstr';
```

## Bitcoinlink Usage Pattern

```typescript
import { 
  createDirectMessage, 
  decryptDirectMessage,
  generateKeypair 
} from 'snstr';

// CREATE LINK: Sender creates gift-wrapped NWC URL
async function createBitcoinLink(nwcUrl: string, amount: number) {
  const receiver = await generateKeypair();  // For URL
  const sender = await generateKeypair();    // Ephemeral sender
  
  const payload = JSON.stringify({
    type: 'bitcoinlink',
    nwcUrl,
    amount
  });
  
  const giftWrap = await createDirectMessage(
    payload,
    sender.privateKey,
    receiver.publicKey
  );
  
  // Return event + receiver private key for URL
  return {
    event: giftWrap,
    receiverPrivateKey: receiver.privateKey
  };
}

// CLAIM LINK: Receiver decrypts to get NWC URL
function claimBitcoinLink(giftWrap: NostrEvent, receiverPrivateKey: string) {
  const rumor = decryptDirectMessage(giftWrap, receiverPrivateKey);
  const payload = JSON.parse(rumor.content);
  return payload.nwcUrl;  // Use for payment
}
```

## Privacy Features

- **Metadata protection**: Outer pubkey is ephemeral, hiding sender identity
- **Timestamp obfuscation**: Timestamps are randomized up to 2 days in past
- **Recipient privacy**: Only receiver can decrypt (has private key)

## Error Handling

```typescript
try {
  const rumor = decryptDirectMessage(giftWrap, privateKey);
} catch (error) {
  // Possible errors:
  // - "Invalid gift wrap kind" - wrong event kind
  // - "Invalid seal kind" - corrupted inner structure
  // - "Invalid seal signature" - tampered event
  // - "Sender mismatch between seal and rumor" - inconsistent pubkeys
  // - "Invalid rumor kind" - unexpected inner message type
}
```
