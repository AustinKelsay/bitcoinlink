# Nostr Protocol Context

## What is Nostr?

Nostr (Notes and Other Stuff Transmitted by Relays) is a simple, open protocol for decentralized social networking and communication. It uses cryptographic keys for identity and relays for message distribution.

**Key Properties:**
- Decentralized (no central server)
- Censorship-resistant
- Cryptographic identity (public/private keys)
- Simple protocol (JSON over WebSocket)

---

## Core Concepts

### Keys

Every Nostr user has a keypair:
- **Private Key (nsec):** Secret key for signing, never shared
- **Public Key (npub):** Identity, can be shared

```javascript
import { generatePrivateKey, getPublicKey } from 'nostr-tools';

const sk = generatePrivateKey();  // Private key (Uint8Array)
const pk = getPublicKey(sk);      // Public key (hex string)
```

### Events

All data in Nostr is an "event" - a signed JSON object:

```json
{
  "id": "event_id_hash",
  "pubkey": "author_public_key",
  "created_at": 1699876543,
  "kind": 1,
  "tags": [["e", "referenced_event"], ["p", "referenced_pubkey"]],
  "content": "Hello, world!",
  "sig": "signature"
}
```

### Relays

Relays are servers that store and forward events:
- Accept events from clients
- Store events in database
- Forward events to subscribers
- Filter events by criteria

---

## Event Kinds

| Kind | Description | Usage in BitcoinLink |
|------|-------------|---------------------|
| 0 | Metadata | User profiles |
| 1 | Short Text Note | Posts |
| 4 | Encrypted DM | NIP-04 messages |
| 33194 | NWA Info Event | Wallet auth response |

### Kind 33194 (NWA Info Event)

Used by Mutiny wallet for NWA (Nostr Wallet Auth) responses:

```json
{
  "kind": 33194,
  "pubkey": "wallet_pubkey",
  "tags": [["d", "app_pubkey"]],
  "content": "encrypted_nwc_credentials"
}
```

---

## NIPs (Nostr Implementation Possibilities)

### NIP-04: Encrypted Direct Messages

Encryption scheme for private messages using shared secrets.

**Encryption:**
```javascript
import { nip04 } from 'nostr-tools';

// Encrypt message
const ciphertext = await nip04.encrypt(
  senderPrivateKey,
  recipientPublicKey,
  plaintext
);
```

**Decryption:**
```javascript
// Decrypt message
const plaintext = await nip04.decrypt(
  recipientPrivateKey,
  senderPublicKey,
  ciphertext
);
```

**In BitcoinLink:**
Used to decrypt NWA responses from Mutiny wallet:

```javascript
const decrypted = await nip04.decrypt(
  appPrivKey,
  event.pubkey,
  event.content
);
const { secret } = JSON.parse(decrypted);
```

---

## SimplePool

nostr-tools provides `SimplePool` for managing multiple relay connections:

```javascript
import { SimplePool } from 'nostr-tools';

const pool = new SimplePool({ seenOnEnabled: true });

// Subscribe to events
const sub = pool.sub(
  ['wss://relay1.com', 'wss://relay2.com'],
  [{ kinds: [1], authors: ['pubkey'] }]
);

sub.on('event', (event) => {
  console.log('Received:', event);
});

// Query events
const events = await pool.list(relays, filters);

// Publish event
await pool.publish(relays, event);
```

### Event Deduplication

```javascript
const pool = new SimplePool({ seenOnEnabled: true });

const sub = pool.sub(relays, filters, {
  alreadyHaveEvent: (id, relay) => {
    // Return true if event already processed
    return pool.seenOn(id).length > 0;
  }
});
```

---

## Nostr Wallet Auth (NWA)

### What is NWA?

NWA is a protocol for wallet applications to authorize connections from apps. It uses Nostr as the communication layer.

### NWA URI Format

```
nostr+walletauth://app_pubkey?relay=relay_url&secret=random&required_commands=pay_invoice&budget=1000/year&identity=wallet_identity
```

| Parameter | Description |
|-----------|-------------|
| `app_pubkey` | Application's public key |
| `relay` | Nostr relay URL (encoded) |
| `secret` | Random secret for verification |
| `required_commands` | NWC commands needed |
| `budget` | Budget limit (e.g., "1000/year") |
| `identity` | Wallet identity pubkey |

### NWA Flow

```
1. App generates keypair and NWA URI
2. User scans QR or clicks link
3. Wallet opens with connection request
4. User approves budget and permissions
5. Wallet creates NWC credentials
6. Wallet publishes kind 33194 event with encrypted credentials
7. App subscribes and receives event
8. App decrypts credentials
9. App constructs NWC URL for payments
```

### In BitcoinLink (MutinyModal)

```javascript
// 1. Generate app keypair
const sk = generatePrivateKey();
const appPublicKey = getPublicKey(sk);

// 2. Create NWA URI
const nwaUri = `nostr+walletauth://${appPublicKey}?relay=${relayUrl}&secret=${secret}&required_commands=pay_invoice&budget=${budget}&identity=${identity}`;

// 3. Subscribe to response events
subscribeToEvents([{
  kinds: [33194],
  since: Math.round(Date.now() / 1000),
  "#d": [appPublicKey]
}]);

// 4. On event received, decrypt credentials
fetchedEvents.forEach(async (event) => {
  if (event.tags[0][1] === appPublicKey) {
    const decrypted = await nip04.decrypt(
      appPrivKey,
      event.pubkey,
      event.content
    );
    const { secret: responseSecret } = JSON.parse(decrypted);

    if (responseSecret === secret) {
      // 5. Construct NWC URL
      const nwcUri = `nostr+walletconnect://${event.pubkey}?relay=${relayUrl}&pubkey=${appPublicKey}&secret=${appPrivKey}`;

      // 6. Use NWC URL for payments
      await generateLinks(nwcUri);
    }
  }
});
```

---

## Relays Used by BitcoinLink

```javascript
const relays = [
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://nostr.gleeze.com",
  "wss://relay.snort.social",
  "wss://relay.nostr.band",
  "wss://relay.xp.live",
  "wss://relay.wellorder.net",
  "wss://nostr-relay.ktwo.io",
  "wss://r.v0l.io",
  "wss://nostr.mutinywallet.com",  // Primary for Mutiny
  "wss://bitcoiner.social",
  "wss://relay.primal.net"
];
```

---

## nostr-tools Usage Summary

| Function | Purpose |
|----------|---------|
| `generatePrivateKey()` | Create new private key |
| `getPublicKey(sk)` | Derive public key from private |
| `nip04.encrypt()` | Encrypt message for recipient |
| `nip04.decrypt()` | Decrypt message from sender |
| `SimplePool` | Manage multiple relay connections |
| `pool.sub()` | Subscribe to events |
| `pool.seenOn()` | Check if event seen on relays |
