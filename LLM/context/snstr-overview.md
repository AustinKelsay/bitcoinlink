# snstr - Secure Nostr Software Toolkit for Renegades

This file provides critical snstr documentation for the Bitcoinlink Nostr refactor.

## Project Overview

SNSTR is a comprehensive TypeScript library for the Nostr protocol. It implements multiple NIPs (Nostr Implementation Possibilities) with a focus on security, performance, and ease of use.

## Essential Imports for Bitcoinlink

```typescript
import {
  // Core client
  Nostr,
  
  // Keypair generation
  generateKeypair,
  getPublicKey,
  
  // Gift wrap (NIP-17)
  createDirectMessage,
  decryptDirectMessage,
  GIFT_WRAP_KIND,  // 1059
  
  // NIP-44 encryption (used by gift wrap)
  encryptNIP44,
  decryptNIP44,
  
  // NWC (NIP-47)
  NostrWalletConnectClient,
  parseNWCURL,
  
  // Event utilities
  createEvent,
  getEventHash,
  signEvent,
  verifyEvent,
  
  // Deletion (NIP-09)
  createDeletionRequest,
  
  // Types
  NostrEvent,
} from 'snstr';
```

## Key APIs for Bitcoinlink

### Gift Wrap (NIP-17) - Core for link encryption

```typescript
// Create a gift-wrapped direct message
const giftWrap = await createDirectMessage(
  message,           // string content
  senderPrivateKey,  // hex private key
  receiverPublicKey  // hex public key
);

// Decrypt a gift-wrapped message
const rumor = decryptDirectMessage(giftWrap, receiverPrivateKey);
// rumor.content contains the original message
```

### Nostr Wallet Connect (NIP-47) - For payments

```typescript
const connectionOptions = parseNWCURL('nostr+walletconnect://...');
const client = new NostrWalletConnectClient(connectionOptions);

await client.init();
const result = await client.payInvoice(bolt11Invoice);
// result.preimage contains payment proof
await client.disconnect();
```

### Relay Connection

```typescript
const nostr = new Nostr(['wss://relay1.com', 'wss://relay2.com']);
await nostr.connectToRelays();

// Publish event
await nostr.publishEvent(event);

// Subscribe to events
const subIds = nostr.subscribe(
  [{ ids: [eventId], kinds: [1059] }],
  (event) => console.log('Received:', event)
);

// Cleanup
nostr.unsubscribe(subIds);
nostr.disconnectFromRelays();
```

### Keypair Management

```typescript
// Generate new keypair
const { privateKey, publicKey } = await generateKeypair();

// Get public key from private key
const pubkey = getPublicKey(privateKey);
```

### Deletion Events (NIP-09) - For claim tracking

```typescript
const deletionEvent = createDeletionRequest(
  { ids: [eventIdToDelete], content: 'reason' },
  authorPublicKey
);

// Sign and publish the deletion event
const id = await getEventHash(deletionEvent);
const sig = signEvent(id, privateKey);
const signed = { ...deletionEvent, id, sig };
await nostr.publishEvent(signed);
```

## Testing with Ephemeral Relay

snstr includes an ephemeral relay for testing:

```typescript
import { EphemeralRelay } from 'snstr';

const relay = new EphemeralRelay();
const port = await relay.start();
const relayUrl = `ws://localhost:${port}`;

// Use relayUrl for testing
// ...

await relay.stop();
```

## Event Structure

### Gift Wrap (Kind 1059)
```typescript
interface GiftWrapEvent {
  kind: 1059;
  content: string;  // NIP-44 encrypted seal
  pubkey: string;   // Ephemeral sender pubkey
  created_at: number;
  tags: [['p', recipientPubkey]];
  id: string;
  sig: string;
}
```

### Seal (Kind 13) - Inside gift wrap
Contains NIP-44 encrypted rumor

### Rumor (Kind 14) - Inside seal
```typescript
interface Rumor {
  kind: 14;
  content: string;  // The actual message
  pubkey: string;   // Real sender pubkey
  created_at: number;
  tags: [...];
}
```

## Rate Limiting

snstr has built-in rate limiting. Configure if needed:

```typescript
const nostr = new Nostr(relays, {
  rateLimits: {
    subscribePerMinute: 30,
    publishPerMinute: 60,
    fetchPerMinute: 30,
  }
});
```
