# Security Implementation

## Overview

BitcoinLink implements a non-custodial security model using Nostr protocol features. The service never holds users' Bitcoin and relies on cryptographic encryption for security.

---

## Non-Custodial Architecture

BitcoinLink never has access to user funds:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Payment Flow                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Sender's Wallet ──NWC Protocol──▶ Recipient's Wallet          │
│         │                                │                       │
│         │                                │                       │
│         ▼                                ▼                       │
│    Holds funds                    Receives funds                │
│                                                                  │
│                    BitcoinLink App                               │
│                          │                                       │
│                          ▼                                       │
│                   Never holds funds                              │
│                   Only facilitates connection                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Encryption: NIP-17 Gift Wrap

NWC URLs are protected using multi-layer encryption via gift wrap.

### Gift Wrap Structure

```text
┌─────────────────────────────────────┐
│ Gift Wrap (Kind 1059)               │
│ - pubkey: EPHEMERAL (random)        │  ← Hides sender identity
│ - content: NIP-44 encrypted seal    │
│ - tags: [["p", receiver_pubkey]]    │
├─────────────────────────────────────┤
│ Seal (Kind 13)                      │
│ - pubkey: ephemeral sender          │
│ - content: NIP-44 encrypted rumor   │
│ - signed by sender                  │
├─────────────────────────────────────┤
│ Rumor (Kind 14)                     │
│ - content: { nwcUrl, amount }       │  ← Actual sensitive data
└─────────────────────────────────────┘
```

### Encryption Flow

**Creating a link:**
```typescript
// src/lib/nostr/gift-wrap.ts
export async function createBitcoinLink(
  payload: BitcoinLinkPayload
): Promise<BitcoinLinkResult> {
  const receiver = await generateKeypair();  // Private key → URL
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
export function decryptBitcoinLink(
  giftWrap: NostrEvent,
  receiverPrivateKey: string
): BitcoinLinkPayload {
  if (giftWrap.kind !== GIFT_WRAP_KIND) {
    throw new Error(`Invalid event kind: expected ${GIFT_WRAP_KIND}`);
  }
  
  const rumor = decryptDirectMessage(giftWrap, receiverPrivateKey);
  const payload = JSON.parse(rumor.content);
  validatePayload(payload);  // Validates type, nwcUrl, amount
  return payload;
}
```

---

## Secret Handling

### What's in the URL

```text
https://bitcoinlink.app/claim/{base64url}
                              │
                              ▼
┌─────────────────────────────────────────────┐
│ Decoded JSON:                               │
│ {                                           │
│   "eventId": "abc123...",       ← Find event│
│   "receiverPrivateKey": "def...",← Decrypt  │
│   "relays": ["wss://..."],                  │
│   "amountSats": 1000                        │
│ }                                           │
└─────────────────────────────────────────────┘
```

### What's Stored on Relays

```text
┌─────────────────────────────────────────────┐
│ Gift Wrap Event (Kind 1059)                 │
│                                             │
│ - Encrypted content (useless without key)   │
│ - Ephemeral pubkeys (no identity leak)      │
│ - Randomized timestamp                      │
│                                             │
│ Contains (when decrypted):                  │
│ - NWC URL (access to sender's wallet)       │
│ - Amount (sats)                             │
└─────────────────────────────────────────────┘
```

### Security Properties

| Data | Stored In | Accessible By |
|------|-----------|---------------|
| Receiver Private Key | URL only | Anyone with link |
| NWC URL | Encrypted on relay | Only with private key |
| Event ID | URL and relay | Public (but useless alone) |

---

## Claim Protection: NIP-09 Deletion

Deletion events prevent double-claiming.

### How It Works

```text
Before Claim:
┌───────────────┐
│ Gift Wrap     │  Event exists
│ Event         │  No deletion event
└───────────────┘

After Claim:
┌───────────────┐     ┌───────────────┐
│ Gift Wrap     │     │ Deletion      │
│ Event         │     │ Event (K:5)   │
│               │ ←── │ #e: eventId   │
└───────────────┘     └───────────────┘
```

### Implementation

**Publishing deletion after payment:**
```typescript
// src/lib/nostr/client.ts
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
  // Subscribe to kind 5 events with #e tag matching eventId
  // If any event found, link was claimed
}
```

---

## Invoice Validation

Before executing payment, the claim page validates user input:

```typescript
// src/pages/claim/[slug].tsx
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
    if (!result.valid) return false;
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

---

## Privacy Features

### Gift Wrap Provides

- **Sender anonymity:** Ephemeral pubkeys for each link
- **Timestamp obfuscation:** Randomized up to 2 days in past (handled by snstr's `createDirectMessage`)
- **Content encryption:** NIP-44 (modern, secure encryption)

> **Note:** The gift-wrap timestamp is intentionally randomized by snstr to prevent timing analysis attacks. When validating received gift-wraps, do NOT reject events based on timestamp age alone—the randomization is a privacy feature, not a bug. However, extremely old timestamps (beyond the 2-day window) should be treated with caution as they may indicate replay attacks.

### What's NOT Logged

- No user accounts
- No IP tracking
- No analytics
- No server-side logging (client-only app)

---

## Security Checklist

| Threat | Mitigation |
|--------|------------|
| Fund custody | Non-custodial NWC architecture |
| Credential theft | NIP-17 gift wrap encryption |
| Relay breach | Encrypted content useless without key |
| Link reuse | NIP-09 deletion events |
| Double-claim | Deletion check before showing claim UI |
| Invoice manipulation | Bolt11 validation |
| NWC URL exposure | Only accessible with private key from URL |

---

## Attack Vectors & Mitigations

### 1. URL Interception
**Threat:** Attacker intercepts link URL
**Mitigation:** Treat links like private keys - share securely

### 2. Relay Compromise
**Threat:** Attacker gains access to relay data
**Mitigation:** Content is encrypted; useless without receiver private key

### 3. Replay Attack
**Threat:** Attacker replays claim transaction
**Mitigation:** Deletion event published after successful claim

### 4. Brute Force Decryption
**Threat:** Attacker tries to decrypt event
**Mitigation:** NIP-44 uses modern cryptography (XChaCha20-Poly1305)

---

## Recommendations for Users

1. **Treat links like cash:** Once shared, anyone with the link can claim
2. **Use secure channels:** Don't share links in public channels
3. **Set appropriate budgets:** Only approve the budget you intend to give away
4. **Check wallet NWC permissions:** Ensure only `pay_invoice` is granted
5. **Monitor NWC connections:** Review and revoke unused connections

---

## What's NOT Implemented (By Design)

| Feature | Reason |
|---------|--------|
| Rate limiting | Client-side app; no server to rate limit |
| Server-side validation | No server; all validation is client-side |
| User authentication | Non-custodial; no user accounts needed |
| Audit logging | Client-only; no server to log on |
