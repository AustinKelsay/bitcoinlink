# BitcoinLink Implementation Overview

## Architecture Summary

BitcoinLink is a **client-side only** Next.js application that uses Nostr relays for storage instead of a database.

```
┌────────────────────────────────────────────────────────────────┐
│                    BitcoinLink Architecture                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   Next.js Frontend                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │   Pages     │  │  Components │  │   Hooks         │ │  │
│  │  │  - index    │  │  - LinkModal│  │  - useToast     │ │  │
│  │  │  - claim/   │  │  - MutinyM..│  │  - useSubscribe │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                         │  │
│  │  ┌─────────────────────────────────────────────────┐   │  │
│  │  │              src/lib/nostr/                      │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐│   │  │
│  │  │  │ client   │ │gift-wrap │ │ link-encoder     ││   │  │
│  │  │  │ .ts      │ │ .ts      │ │ .ts              ││   │  │
│  │  │  └──────────┘ └──────────┘ └──────────────────┘│   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐│   │  │
│  │  │  │nwc-client│ │ relays   │ │ types            ││   │  │
│  │  │  │ .ts      │ │ .ts      │ │ .ts              ││   │  │
│  │  │  └──────────┘ └──────────┘ └──────────────────┘│   │  │
│  │  └─────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Nostr Relays                          │  │
│  │   wss://relay.damus.io  wss://nos.lol  wss://...        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14.2.3, React 18, TypeScript |
| UI | Tailwind CSS, PrimeReact |
| Nostr | snstr (local), nostr-tools 1.17.0 |
| Bitcoin | @getalby/sdk, light-bolt11-decoder |

## Directory Structure

```
bitcoinlink/
├── src/
│   ├── lib/
│   │   └── nostr/                 # Core Nostr implementation
│   │       ├── index.ts           # Re-exports all modules
│   │       ├── types.ts           # TypeScript interfaces
│   │       ├── client.ts          # Relay connection management
│   │       ├── gift-wrap.ts       # NIP-17 gift wrap creation/decryption
│   │       ├── link-encoder.ts    # URL encoding/decoding (base64url)
│   │       ├── nwc-client.ts      # NWC payment execution
│   │       └── relays.ts          # Default relay configuration
│   ├── pages/
│   │   ├── _app.tsx               # App wrapper with ToastProvider
│   │   ├── _document.tsx          # HTML document template
│   │   ├── index.tsx              # Home page - link generation
│   │   └── claim/
│   │       └── [slug].tsx         # Claim page - link redemption
│   ├── components/
│   │   ├── AlbyButton.tsx         # Alby wallet integration
│   │   ├── LinkModal.tsx          # Generated links display
│   │   ├── Footer.tsx             # Page footer
│   │   ├── mutiny/                # Mutiny wallet components
│   │   │   ├── MutinyButton.tsx
│   │   │   ├── MutinyModal.tsx
│   │   │   └── MutinyInstructions.tsx
│   │   ├── strike/                # Strike wallet components
│   │   │   ├── StrikeButton.tsx
│   │   │   └── StrikeInstructions.tsx
│   │   └── cashapp/               # CashApp components
│   │       ├── CashAppButton.tsx
│   │       └── CashAppInstructions.tsx
│   ├── hooks/
│   │   ├── useToast.tsx           # Toast notification context
│   │   └── useSubscribeToEvents.ts # Nostr event subscription (legacy)
│   ├── utils/
│   │   └── bolt11.ts              # Bolt11 invoice utilities
│   └── styles/
│       └── globals.css            # Global Tailwind styles
├── public/                        # Static assets (wallet logos, etc.)
├── LLM/context/                   # snstr documentation
├── llm/                           # Project documentation
│   ├── context/                   # Background information
│   ├── implementation/            # Code documentation
│   └── workflows/                 # User flow documentation
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.mjs
```

## Core Data Flow

### Link Creation

```
1. User Input (numberOfLinks, satsPerLink)
         │
         ▼
2. Wallet Connection (Alby or Mutiny)
         │
         ▼
3. Get NWC URL from wallet
         │
         ▼
4. For each link:
   ├── Create payload: { type: 'bitcoinlink', nwcUrl, amount }
   ├── Generate receiver keypair
   ├── Gift-wrap payload (NIP-17)
   ├── Publish event to relays
   └── Create URL: base64url({ eventId, receiverPrivateKey, relays, amountSats })
         │
         ▼
5. Display links in modal
```

### Link Claiming

```
1. Decode URL slug (base64url → JSON)
         │
         ▼
2. Check for deletion event (already claimed?)
         │
         ▼
3. Fetch gift wrap event from relays
         │
         ▼
4. Decrypt with receiver private key
         │
         ▼
5. User provides Lightning address/invoice
         │
         ▼
6. Fetch invoice (if address/LNURL)
         │
         ▼
7. Pay invoice via NWC
         │
         ▼
8. Publish deletion event (NIP-09)
         │
         ▼
9. Show success / update UI
```

## Key Entry Points

| File | Purpose |
|------|---------|
| `src/pages/index.tsx` | Link generation UI, wallet connection |
| `src/pages/claim/[slug].tsx` | Link claiming UI, payment execution |
| `src/lib/nostr/gift-wrap.ts` | Core encryption/decryption |
| `src/lib/nostr/client.ts` | Relay communication |
| `src/lib/nostr/nwc-client.ts` | Payment execution |

## What's NOT in the Codebase

The Nostr-only refactor removed:

| Removed | Replaced By |
|---------|-------------|
| PostgreSQL database | Nostr relays |
| Prisma ORM | snstr library |
| API routes (CRUD) | Client-side Nostr |
| Rate limiting middleware | None (client-side) |
| Server-side encryption | Gift wrap (NIP-17) |
| `src/models/` directory | `src/lib/nostr/` |
| `src/pages/api/` directory | Removed entirely |

## Security Model

### Encryption Layers

```
┌─────────────────────────────────────┐
│ Link URL                            │
│ Contains: eventId, receiverPrivKey  │
├─────────────────────────────────────┤
│ Gift Wrap Event (Kind 1059)         │
│ - Ephemeral sender pubkey           │
│ - NIP-44 encrypted seal             │
├─────────────────────────────────────┤
│ Seal (Kind 13)                      │
│ - Signed by ephemeral sender        │
│ - NIP-44 encrypted rumor            │
├─────────────────────────────────────┤
│ Rumor (Kind 14)                     │
│ - Contains BitcoinLink payload      │
│ - { type, nwcUrl, amount }          │
└─────────────────────────────────────┘
```

### Non-Custodial Design

- App never holds funds
- NWC URL only accessible with private key from URL
- Payment goes directly: sender wallet → recipient
- No central point of failure

## Build and Development

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Lint
npm run lint

# Test
npm test
```

## Environment Variables

**None required.** The app uses public Nostr relays.

## Key Imports

```typescript
// From src/lib/nostr (custom)
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

// From snstr
import {
  createDirectMessage,
  decryptDirectMessage,
  generateKeypair,
  getPublicKey,
  NostrWalletConnectClient,
  parseNWCURL,
  GIFT_WRAP_KIND,
} from 'snstr';

// From @getalby/sdk (Alby connection)
import { nwc } from '@getalby/sdk';
```
