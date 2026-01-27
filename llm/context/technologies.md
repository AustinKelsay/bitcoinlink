# Technologies & Dependencies

## Core Framework

### Next.js 14.2.3
- React framework for production
- File-based routing (Pages Router)
- Client-side only (no SSR required for this app)
- Static export capability

### React 18
- Frontend UI library
- Hooks-based architecture
- Context for state management (ToastProvider)

### TypeScript 5.x
- Type-safe development
- Enhanced IDE support
- Compile-time error checking

## Nostr Protocol

### snstr (local dependency)
Primary Nostr library providing all protocol features:

**Gift Wrap (NIP-17):**
```typescript
import { createDirectMessage, decryptDirectMessage, GIFT_WRAP_KIND } from 'snstr';
```

**NWC (NIP-47):**
```typescript
import { NostrWalletConnectClient, parseNWCURL } from 'snstr';
```

**Key Management:**
```typescript
import { generateKeypair, getPublicKey } from 'snstr';
```

**Deletion Events (NIP-09):**
```typescript
import { createDeletionRequest, getEventHash, signEvent } from 'snstr';
```

### nostr-tools 1.17.0
- Legacy Nostr protocol implementation
- Used for SimplePool in Mutiny NWA flow
- Provides NIP-04 encryption for wallet auth

## UI & Styling

### Tailwind CSS 3.4.1
- Utility-first CSS framework
- Responsive design
- Custom configuration

### PrimeReact 10.2.1
- React component library
- Pre-built UI components
- Used for: Dialog, Button, InputText, InputNumber, ProgressSpinner, Toast

### PrimeIcons 6.0.1
- Icon library for PrimeReact
- Font-based icons

### qrcode.react 3.1.0
- QR code React component
- Used for Mutiny NWA URI display
- SVG-based rendering

## Bitcoin & Lightning

### @getalby/sdk 3.5.0
- Alby wallet integration
- NWC client for generating wallet connections
- WebLN provider detection
- Used for: `nwc.NWCClient.withNewSecret()`, `initNWC()`

### light-bolt11-decoder 3.1.1
- Bolt11 Lightning invoice parser
- Extracts amount, description, expiry
- Validates invoice structure

### bech32 2.0.0
- Bech32 encoding/decoding
- Used for LNURL decoding
- Lightning address processing

## Development Dependencies

### Jest 29.7.0
- Testing framework
- With ts-jest for TypeScript support

### ESLint 8.x
- JavaScript/TypeScript linter
- Code quality enforcement
- `eslint-config-next` for Next.js rules

### PostCSS 8.x
- CSS processing
- Required by Tailwind CSS

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest"
  }
}
```

## Dependency Graph

```
bitcoinlink
├── Framework
│   ├── next (14.2.3)
│   ├── react (18.x)
│   └── typescript (5.9.3)
├── Nostr
│   ├── snstr (local) - Primary
│   └── nostr-tools (1.17.0) - Legacy/NWA
├── UI
│   ├── primereact (10.2.1)
│   ├── primeicons (6.0.1)
│   ├── tailwindcss (3.4.1)
│   └── qrcode.react (3.1.0)
└── Bitcoin/Lightning
    ├── @getalby/sdk (3.5.0)
    ├── light-bolt11-decoder (3.1.1)
    └── bech32 (2.0.0)
```

## What's NOT Used (Removed in Refactor)

The following were removed when migrating to the Nostr-only architecture:
- PostgreSQL / any database
- Prisma ORM
- API routes for CRUD operations
- Rate limiting (@upstash/ratelimit, @vercel/kv)
- Server-side middleware
- axios (replaced with native fetch)
- Server-side encryption (now handled by NIP-17 gift wrap)

## Version Compatibility Notes

- **snstr**: Local dependency from `../snstr` - must be available
- **nostr-tools 1.17.0**: Specific version for compatibility with snstr
- **Next.js 14**: Uses Pages Router (not App Router)
