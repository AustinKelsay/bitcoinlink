# Technologies & Dependencies

## Core Framework

### Next.js 14.2.3
- Full-stack React framework
- Server-side rendering and API routes
- File-based routing
- Built-in optimization

### React 18
- Frontend UI library
- Hooks-based architecture
- Context for state management

## Database

### PostgreSQL
- Primary data store
- Relational database
- Hosted on Vercel Postgres (production)

### Prisma 5.13.0
- ORM (Object-Relational Mapping)
- Type-safe database queries
- Schema management and migrations
- Packages: `@prisma/client`, `prisma` (dev)

## UI & Styling

### Tailwind CSS 3.4.1
- Utility-first CSS framework
- Responsive design
- Custom configuration

### PrimeReact 10.2.1
- React component library
- Pre-built UI components
- Used for: Dialog, Button, InputText, TabView, Toast, ProgressSpinner

### PrimeIcons 6.0.1
- Icon library for PrimeReact
- Font-based icons

## Bitcoin & Lightning

### @getalby/sdk 3.5.0
- Alby wallet integration
- NWC (Nostr Wallet Connect) client
- WebLN provider for payments
- Used for: `nwc.NWCClient`, `webln.NostrWebLNProvider`

### light-bolt11-decoder 3.1.1
- Bolt11 Lightning invoice parser
- Extracts amount, description, expiry
- Validates invoice structure

### bech32 2.0.0
- Bech32 encoding/decoding
- Used for LNURL decoding
- Lightning address processing

## Nostr Protocol

### nostr-tools 1.17.0
- Nostr protocol implementation
- Key generation and management
- Event signing and verification
- NIP-04 encryption/decryption
- SimplePool for relay connections
- Used for: `SimplePool`, `nip04`, `generatePrivateKey`, `getPublicKey`

### websocket-polyfill 1.0.0
- WebSocket polyfill for Node.js
- Required for server-side Nostr connections

## HTTP & Networking

### axios 1.6.8
- HTTP client
- API requests from frontend
- Used for internal API calls

### cross-fetch 4.0.0
- Isomorphic fetch implementation
- Works in browser and Node.js
- Used for server-side HTTP requests

## Utilities

### uuid 9.0.1
- UUID generation
- Used for link index generation
- `v4` function for random UUIDs

### qrcode.react 3.1.0
- QR code React component
- Used for Mutiny NWA URI display
- SVG-based rendering

### crypto (Node.js built-in)
- Cryptographic functions
- AES-256-CBC encryption/decryption
- Random bytes generation

## Rate Limiting

### @upstash/ratelimit 1.2.1
- Redis-based rate limiting
- Sliding window algorithm
- Serverless-friendly

### @vercel/kv 2.0.0
- Vercel KV (Redis) client
- Storage for rate limit state
- Serverless key-value store

## Development Dependencies

### ESLint 8.x
- JavaScript linter
- Code quality enforcement
- `eslint-config-next` for Next.js rules

### PostCSS 8.x
- CSS processing
- Required by Tailwind CSS
- Autoprefixer integration

### TypeScript Types
- `@types/node 20.14.10`
- Node.js type definitions
- Development-time type checking

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build && prisma migrate deploy",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate"
  }
}
```

## Dependency Graph

```
bitcoinlink
├── Framework
│   ├── next (14.2.3)
│   └── react (18.x)
├── Database
│   ├── @prisma/client (5.13.0)
│   └── prisma (5.13.0) [dev]
├── UI
│   ├── primereact (10.2.1)
│   ├── primeicons (6.0.1)
│   └── tailwindcss (3.4.1) [dev]
├── Bitcoin/Lightning
│   ├── @getalby/sdk (3.5.0)
│   ├── light-bolt11-decoder (3.1.1)
│   └── bech32 (2.0.0)
├── Nostr
│   ├── nostr-tools (1.17.0)
│   └── websocket-polyfill (1.0.0)
├── HTTP
│   ├── axios (1.6.8)
│   └── cross-fetch (4.0.0)
├── Utilities
│   ├── uuid (9.0.1)
│   └── qrcode.react (3.1.0)
└── Rate Limiting
    ├── @upstash/ratelimit (1.2.1)
    └── @vercel/kv (2.0.0)
```

## Version Compatibility Notes

- **nostr-tools 1.17.0**: Specific version used; newer versions may have breaking changes
- **Prisma**: Binary targets configured for `native` and `debian-openssl-1.1.x`
- **Next.js 14**: Uses Pages Router (not App Router)
