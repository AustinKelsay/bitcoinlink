# BitcoinLink Project Overview

## What is BitcoinLink?

BitcoinLink is an open-source, non-custodial payment service that allows users to send Bitcoin via shareable links using the Lightning Network. It uses a **pure Nostr-based architecture** with no backend database—all data is stored as encrypted events on Nostr relays.

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

## Architecture: Nostr-Only

**No database. No backend API. Pure Nostr.**

BitcoinLink stores all data on Nostr relays using encrypted events:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BitcoinLink Architecture                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐        ┌──────────────┐        ┌──────────────┐         │
│   │   Sender     │        │   BitcoinLink│        │  Nostr       │         │
│   │   Wallet     │───────▶│   App        │───────▶│  Relays      │         │
│   │   (Alby/     │  NWC   │  (Frontend)  │ Events │              │         │
│   │    Mutiny)   │        │              │        │              │         │
│   └──────────────┘        └──────────────┘        └──────────────┘         │
│                                  │                       │                  │
│                                  │                       │                  │
│                                  ▼                       ▼                  │
│                           ┌──────────────┐        ┌──────────────┐         │
│                           │   Shareable  │        │   Gift Wrap  │         │
│                           │   Link URL   │        │   Event      │         │
│                           │              │        │   (Kind 1059)│         │
│                           └──────────────┘        └──────────────┘         │
│                                                                              │
│   ┌──────────────┐        ┌──────────────┐        ┌──────────────┐         │
│   │   Recipient  │        │   BitcoinLink│        │   Sender     │         │
│   │   Wallet     │◀───────│   App        │◀───────│   Wallet     │         │
│   │              │ Payment│  (Frontend)  │  NWC   │              │         │
│   └──────────────┘        └──────────────┘        └──────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Features

### Non-Custodial Architecture
- BitcoinLink never holds user funds
- Payments route directly from sender's wallet to recipient
- Uses Nostr Wallet Connect (NWC) for wallet authorization
- NWC credentials stored encrypted on Nostr relays

### Shareable Payment Links
- Generate single-use Bitcoin payment links
- Links contain encrypted references to NWC credentials
- Share via any medium (email, SMS, social, QR codes)
- One-time use prevents double-claiming

### Multiple Wallet Support

**For Senders:**
- Alby (browser extension)
- Mutiny (web/mobile via NWA protocol)

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
- Each link is independent (separate gift-wrapped event)
- Set total budget and per-link amounts

## How It Works

### Sender Flow (Link Creation)
```text
1. User visits bitcoinlink.app
2. Enters: number of links + sats per link
3. Connects wallet (Alby or Mutiny)
4. Wallet approves NWC connection with budget
5. For each link:
   a. Create payload: { type: 'bitcoinlink', nwcUrl, amount }
   b. Generate ephemeral sender and receiver keypairs
   c. Gift-wrap payload using NIP-17 encryption
   d. Publish gift-wrap event to Nostr relays
   e. Create URL containing: eventId + receiverPrivateKey + relays + amount
6. Display shareable links to user
```

### Recipient Flow (Claiming)
```text
1. Recipient clicks shared link
2. App decodes link: eventId, receiverPrivateKey, relays
3. App checks for deletion event (already claimed?)
4. App fetches gift-wrap event from relays
5. App decrypts event using receiver private key
6. Recipient enters Lightning address/invoice/LNURL
7. App fetches invoice from recipient's wallet
8. App pays invoice via NWC (sender's wallet)
9. App publishes deletion event (NIP-09) to mark claimed
```

## Link URL Structure

```text
https://bitcoinlink.app/claim/{base64url_encoded_json}
```

The encoded JSON contains:
```json
{
  "eventId": "abc123...",           // Gift wrap event ID on relays
  "receiverPrivateKey": "def456...", // Key to decrypt the event
  "relays": ["wss://relay.damus.io", ...],
  "amountSats": 1000                // Display amount (also in payload)
}
```

## Nostr Protocol Usage

| NIP | Purpose |
|-----|---------|
| NIP-17 | Gift Wrap - encrypts NWC URL in event |
| NIP-44 | Encryption used by gift wrap |
| NIP-47 | Nostr Wallet Connect - payment execution |
| NIP-09 | Deletion events - mark claims |

## Security Model

### What BitcoinLink Never Stores
- Decryption keys (only in URLs)
- User credentials or passwords
- Private keys
- Actual Bitcoin

### Protection Mechanisms
- Gift wrap encryption (NIP-17 with NIP-44)
- Ephemeral keypairs per link
- Deletion events prevent double-claiming
- No central database to breach

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

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14.2.3, React 18, TypeScript |
| Nostr | snstr (local), nostr-tools 1.17.0 |
| UI | Tailwind CSS, PrimeReact, qrcode.react |
| Bitcoin | @getalby/sdk, light-bolt11-decoder, bech32 |

## Testing

Comprehensive test suite with 130+ tests covering:
- Gift wrap encryption/decryption
- URL encoding/decoding
- Input validation
- NWC payment flow (mocked)
- Full claim flow integration

Run tests: `npm test`

## Open Source

BitcoinLink is fully open source:
- Self-hostable (just a Next.js app)
- Auditable code with test coverage
- Community contributions welcome
- No backend infrastructure required
