# BitcoinLink Project Overview

## What is BitcoinLink?

BitcoinLink is an open-source, non-custodial payment service that allows users to send Bitcoin via shareable links using the Lightning Network. It enables anyone to create single-use payment links that recipients can claim directly to their Lightning wallet.

**Website:** https://bitcoinlink.app

## The Problem It Solves

Traditional Bitcoin payments require:
1. Recipient to provide an address/invoice first
2. Sender and recipient to coordinate in real-time
3. Recipient to have a wallet ready at time of payment

BitcoinLink solves this by:
1. Sender creates links in advance (no recipient coordination needed)
2. Links can be shared asynchronously (email, text, social media)
3. Recipients claim when convenient using any Lightning-compatible wallet
4. Funds go directly to recipient (never held by BitcoinLink)

## Key Features

### Non-Custodial Architecture
- BitcoinLink never holds user funds
- Payments route directly from sender's wallet to recipient
- Uses Nostr Wallet Connect (NWC) for wallet authorization
- Only encrypted connection credentials stored (not funds)

### Shareable Payment Links
- Generate single-use Bitcoin payment links
- Links include encrypted wallet credentials
- Share via any medium (email, SMS, social, QR codes)
- One-time use prevents double-spending

### Multiple Wallet Support

**For Senders:**
- Alby (browser extension)
- Mutiny (web/mobile via NWA)

**For Recipients:**
- Any Lightning address (user@domain.com)
- Any Bolt11 invoice
- Any LNURL-pay endpoint
- Alby (via WebLN)
- Strike
- Mutiny
- CashApp (via Lightning address)

### Batch Link Generation
- Create multiple links from single wallet connection
- Set total budget and links-per-budget
- API endpoint for programmatic link generation

## How It Works

### Sender Flow
```
1. User visits bitcoinlink.app
2. Enters: number of links + sats per link
3. Connects wallet (Alby or Mutiny)
4. Wallet approves NWC connection with budget
5. App encrypts NWC URL with random secret
6. Stores encrypted URL in database
7. Generates shareable links with embedded secrets
8. User shares links with recipients
```

### Recipient Flow
```
1. Recipient clicks shared link
2. Link page shows amount available
3. Recipient enters Lightning address/invoice/LNURL
4. App decrypts NWC URL using secret from link
5. App fetches invoice from recipient's wallet
6. App sends payment via sender's NWC connection
7. Link deleted after successful payment
```

## Security Model

### What BitcoinLink Stores
- Encrypted NWC URLs (useless without secrets)
- Link metadata (IDs, claimed status)

### What BitcoinLink Never Stores
- Decryption secrets (only in link URLs)
- User credentials or passwords
- Private keys
- Actual Bitcoin

### Protection Mechanisms
- AES-256-CBC encryption for NWC URLs
- Single-use links (deleted after claim)
- Rate limiting (5 requests per 10 seconds)
- Invoice amount validation

## Use Cases

### Tipping & Rewards
- Content creators share tip links
- Event organizers distribute rewards
- Podcasters/streamers reward listeners

### Gifts & Payments
- Send Bitcoin as gifts
- Pay freelancers/contractors
- Split bills with friends

### Promotions & Marketing
- Distribute sats for promotions
- Reward survey participants
- Airdrop to community members

### API Integration
- Automated reward distribution
- Programmatic payment links
- Integration with other services

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BitcoinLink.app                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js/React)                                   │
│  - Link generation UI                                       │
│  - Link claiming UI                                         │
│  - Wallet connection flows                                  │
├─────────────────────────────────────────────────────────────┤
│  Backend (Next.js API Routes)                               │
│  - NWC record management                                    │
│  - Link CRUD operations                                     │
│  - Payment execution                                        │
├─────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL/Prisma)                               │
│  - Encrypted NWC storage                                    │
│  - Link tracking                                            │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│  - Nostr relays (NWA auth)                                  │
│  - Lightning Network (payments)                             │
│  - Vercel KV (rate limiting)                               │
└─────────────────────────────────────────────────────────────┘
```

## Open Source

BitcoinLink is fully open source:
- Self-hostable
- Auditable code
- Community contributions welcome
- MIT license
