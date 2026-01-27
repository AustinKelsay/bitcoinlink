# CLAUDE.md - Project Guidance for LLM Development

## Project Overview

**BitcoinLink** is an open-source, non-custodial Bitcoin payment link service built on Nostr.

- **Website:** [https://bitcoinlink.app](https://bitcoinlink.app)
- **Architecture:** Pure Nostr (no database, no backend API)
- **Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, snstr

## Quick Start

```bash
# Install dependencies (snstr is now on npm as ^0.2.0)
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Architecture Summary

```text
BitcoinLink uses Nostr relays instead of a database.

SENDER FLOW:
User → Connect Wallet → Get NWC URL → Gift-wrap (NIP-17) → Publish to Relays → Generate URL

RECEIVER FLOW:
Open URL → Decode → Check Deletion → Fetch Event → Decrypt → Get Invoice → Pay via NWC → Publish Deletion
```

**Key Nostr Usage:**
| NIP | Purpose |
|-----|---------|
| NIP-17 | Gift Wrap - encrypts NWC credentials |
| NIP-44 | Encryption algorithm |
| NIP-47 | Nostr Wallet Connect - payments |
| NIP-09 | Deletion events - claim tracking |

## Key Files to Understand

| File | Purpose |
|------|---------|
| `src/lib/nostr/gift-wrap.ts` | Core link encryption/decryption |
| `src/lib/nostr/client.ts` | Relay connection management |
| `src/lib/nostr/nwc-client.ts` | NWC payment execution |
| `src/lib/nostr/link-encoder.ts` | URL encoding/decoding |
| `src/pages/index.tsx` | Link generation page |
| `src/pages/claim/[slug].tsx` | Link claiming page |

## Common Development Tasks

### Adding a New Wallet Integration

1. Create button component in `src/components/{wallet}/`
2. If WebLN supported: use `window.webln.makeInvoice()`
3. If not: create instruction component with Lightning address guide
4. Add to home page (sender) and/or claim page (receiver)

### Modifying Link Format

The link URL format is in `src/lib/nostr/link-encoder.ts`:

```typescript
interface EncodedLink {
  eventId: string;
  receiverPrivateKey: string;
  relays: string[];
  amountSats: number;
}
```

Changing this requires updating both encoder and decoder.

### Changing Default Relays

Edit `src/lib/nostr/relays.ts`:

```typescript
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://nostr.mutinywallet.com'
];
```

### Adding New Nostr Event Types

Use the snstr library:

```typescript
import { createDirectMessage, decryptDirectMessage, generateKeypair } from 'snstr';
```

See `LLM/context/snstr-*.md` for snstr API documentation.

## Code Patterns

### Toast Notifications

```typescript
const { showToast } = useToast();
showToast('success', 'Title', 'Message');  // success | info | warn | error
```

### Nostr Client Usage

```typescript
const client = new BitcoinLinkNostrClient(relays);
await client.connect();
await client.publish(event);
const event = await client.fetchEvent(eventId);
await client.publishDeletion(eventId, privateKey);
client.close();
```

### NWC Payment

```typescript
import { payInvoiceWithNWC } from '@/lib/nostr';
const result = await payInvoiceWithNWC(nwcUrl, invoice);
// result.preimage contains payment proof
```

## Testing

```bash
npm test       # Run Jest tests
npm run lint   # Run ESLint
```

Tests use Jest with ts-jest. snstr provides an ephemeral relay for testing Nostr functionality.

## Common Gotchas

1. **snstr is a local dependency** - Must be at `../snstr` and built
2. **No API routes** - Everything is client-side Nostr
3. **Private key in URL** - This is by design; treat links like cash
4. **Deletion != deletion** - NIP-09 is a soft delete request; events may persist

## What NOT to Do

- Don't add a database - architecture is intentionally Nostr-only
- Don't add server-side API routes - keep it client-side
- Don't log NWC URLs - they're secrets
- Don't skip deletion event publishing after claim

## Documentation Structure

```
README.md              - User-facing documentation
CLAUDE.md              - This file (LLM guidance)
llm/
├── context/           - Background information
│   ├── project-overview.md
│   ├── technologies.md
│   ├── bitcoin-lightning.md
│   ├── nostr-protocol.md
│   └── deployment.md
├── implementation/    - Code documentation
│   ├── overview.md
│   ├── components.md
│   ├── hooks.md
│   ├── utils.md
│   └── security.md
└── workflows/         - User flow documentation
    ├── sender-flow.md
    └── receiver-flow.md
LLM/context/           - snstr library documentation
    ├── snstr-overview.md
    ├── snstr-nip09-deletion.md
    ├── snstr-nip17-giftwrap.md
    └── snstr-nip47-nwc.md
```

## Key Imports

```typescript
// Custom Nostr library
import {
  createBitcoinLink,
  decryptBitcoinLink,
  BitcoinLinkNostrClient,
  encodeLink,
  decodeLink,
  createClaimUrl,
  payInvoiceWithNWC,
  DEFAULT_RELAYS,
} from '@/lib/nostr';

// snstr
import {
  createDirectMessage,
  decryptDirectMessage,
  generateKeypair,
  getPublicKey,
  NostrWalletConnectClient,
  parseNWCURL,
  GIFT_WRAP_KIND,
  decryptNIP04,
} from 'snstr';

// Alby SDK
import { nwc } from '@getalby/sdk';
```

## Security Considerations

1. **Non-custodial:** App never holds funds
2. **Encryption:** NWC URLs encrypted with NIP-17 gift wrap
3. **Privacy:** Ephemeral keypairs, randomized timestamps
4. **Claim protection:** NIP-09 deletion events prevent double-claiming
5. **Client-side:** No server-side secrets or logging

## Contact / Resources

- **snstr Library:** [https://github.com/AustinKelsay/snstr](https://github.com/AustinKelsay/snstr)
- **Nostr Protocol:** [https://github.com/nostr-protocol/nips](https://github.com/nostr-protocol/nips)
- **NWC Spec:** [https://nwc.dev](https://nwc.dev)
