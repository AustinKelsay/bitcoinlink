# BitcoinLink

An open-source, non-custodial payment service that allows you to send bitcoin using a simple link.

Built on **Nostr** and powered by **Nostr Wallet Connect (NWC)**.

## How It Works

BitcoinLink uses Nostr protocol features to create secure, shareable payment links without any backend database:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Link Creation Flow                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Sender connects wallet (Alby/Mutiny) → gets NWC URL                     │
│  2. App creates gift-wrapped event (NIP-17) containing NWC URL + amount     │
│  3. Event published to Nostr relays                                         │
│  4. Shareable URL contains: event ID + receiver private key + relays        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              Claim Flow                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Recipient opens link → app decodes eventId + receiverPrivateKey         │
│  2. App fetches gift-wrapped event from Nostr relays                        │
│  3. App decrypts event to extract NWC URL                                   │
│  4. Recipient provides Lightning address/invoice                            │
│  5. Payment sent directly via NWC (sender's wallet → recipient)             │
│  6. Deletion event (NIP-09) published to mark link as claimed               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Architecture

**Pure Nostr. No Database. No Backend API.**

| Layer | Technology |
|-------|------------|
| Storage | Nostr relays (gift-wrapped events) |
| Encryption | NIP-17 (Gift Wrap) with NIP-44 encryption |
| Payments | NIP-47 (Nostr Wallet Connect) |
| Claim Tracking | NIP-09 (Deletion Events) |
| Nostr Library | [snstr](https://github.com/AustinKelsay/snstr) |

### What Gets Stored Where

| Data | Location |
|------|----------|
| NWC URL + Amount | Inside gift-wrapped Nostr event on relays |
| Receiver Private Key | Only in the link URL (never stored) |
| Claim Status | NIP-09 deletion event on relays |

## Features

### For Senders
- Generate NWC with **Alby** (browser extension)
- Generate NWC with **Mutiny** (via NWA protocol)
- Create multiple links from one NWC connection
- Set custom amounts per link

### For Recipients
- Claim with any **Lightning address** (user@domain.com)
- Claim with any **Bolt11 invoice**
- Claim with any **LNURL-pay** endpoint
- Claim with **Alby** (WebLN)
- Claim with **Strike**, **Mutiny**, or **CashApp**

## Link URL Format

Links encode all necessary data in base64url format:

```
https://bitcoinlink.app/claim/{base64url_encoded_data}
```

The encoded data contains:
```json
{
  "eventId": "nostr_event_id_hex",
  "receiverPrivateKey": "hex_private_key",
  "relays": ["wss://relay1.com", "wss://relay2.com"],
  "amountSats": 1000
}
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn
- [snstr](https://github.com/AustinKelsay/snstr) library (local dependency)

### Setup

```bash
# Clone the repository
git clone https://github.com/AustinKelsay/bitcoinlink.git
cd bitcoinlink

# Install dependencies (including local snstr)
npm install

# Start development server
npm run dev
```

### Environment Variables

No environment variables required for basic development.

The app connects to public Nostr relays:
- `wss://relay.damus.io`
- `wss://relay.nostr.band`
- `wss://nos.lol`
- `wss://nostr.mutinywallet.com`

### Build

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

## Security Model

### Non-Custodial Architecture
- BitcoinLink **never holds user funds**
- Payments route directly: sender's wallet → recipient's wallet
- NWC credentials are encrypted and only decryptable with the link URL

### Privacy Features
- Gift wrap (NIP-17) hides sender metadata
- Ephemeral keypairs for each link
- Timestamps are randomized
- No user accounts or tracking

### Claim Protection
- Each link can only be claimed once
- Deletion events prevent double-claiming
- Private key is required to decrypt (only in URL)

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS, PrimeReact |
| Nostr | snstr library |
| Bitcoin | @getalby/sdk, light-bolt11-decoder |

## Project Structure

```
src/
├── lib/nostr/           # Nostr protocol implementation
│   ├── client.ts        # Relay connection management
│   ├── gift-wrap.ts     # NIP-17 gift wrap creation/decryption
│   ├── link-encoder.ts  # URL encoding/decoding
│   ├── nwc-client.ts    # NWC payment execution
│   ├── relays.ts        # Default relay configuration
│   └── types.ts         # TypeScript interfaces
├── pages/
│   ├── index.tsx        # Home - link generation
│   └── claim/[slug].tsx # Claim page
├── components/          # React components
├── hooks/               # Custom React hooks
└── utils/               # Utility functions
```

## Contributing

Contributions welcome! Please read the existing code and documentation before submitting PRs.

## License

MIT License

## Links

- **Website:** https://bitcoinlink.app
- **Nostr Wallet Connect:** https://nwc.dev
- **snstr Library:** https://github.com/AustinKelsay/snstr
