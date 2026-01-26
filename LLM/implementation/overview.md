# BitcoinLink Application Architecture Overview

## Project Summary

BitcoinLink is a Next.js 14 web application that enables non-custodial Bitcoin payments via shareable links. Users generate single-use payment links backed by Nostr Wallet Connect (NWC) credentials, which recipients can claim to receive Bitcoin directly to their Lightning wallet.

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14.2.3 (React 18) |
| Database | PostgreSQL with Prisma 5.13.0 ORM |
| Styling | Tailwind CSS 3.4.1, PrimeReact 10.2.1 |
| Bitcoin/Lightning | @getalby/sdk, nostr-tools 1.17.0, light-bolt11-decoder |
| Rate Limiting | @upstash/ratelimit, @vercel/kv |
| Deployment | Docker, Vercel |

## Directory Structure

```
bitcoinlink/
├── src/
│   ├── pages/
│   │   ├── _app.js                 # App wrapper with ToastProvider
│   │   ├── _document.js            # HTML document template
│   │   ├── index.js                # Home page - link generation
│   │   ├── claim/
│   │   │   └── [slug].js           # Claim page - link redemption
│   │   └── api/
│   │       ├── nwc/index.js        # NWC CRUD operations
│   │       ├── links/index.js      # Link CRUD operations
│   │       ├── link/[slug].js      # API link generation endpoint
│   │       └── claim/[slug].js     # Claim and payment execution
│   ├── components/
│   │   ├── AlbyButton.js           # Alby wallet integration
│   │   ├── LinkModal.js            # Generated links display modal
│   │   ├── Footer.js               # Page footer
│   │   ├── ImagePreview.jsx        # Image preview component
│   │   ├── mutiny/                 # Mutiny wallet components
│   │   │   ├── MutinyButton.js
│   │   │   ├── MutinyModal.js
│   │   │   └── MutinyInstructions.js
│   │   ├── strike/                 # Strike wallet components
│   │   │   ├── StrikeButton.js
│   │   │   └── StrikeInstructions.js
│   │   └── cashapp/                # CashApp components
│   │       ├── CashAppButton.js
│   │       └── CashAppInstructions.js
│   ├── hooks/
│   │   ├── useToast.js             # Toast notification context
│   │   └── useSubscribetoEvents.js # Nostr event subscription
│   ├── models/
│   │   ├── nwcModels.js            # NWC database operations
│   │   ├── linkModels.js           # Link database operations
│   │   └── prisma.js               # Prisma client singleton
│   ├── utils/
│   │   └── bolt11.js               # Bolt11 invoice utilities
│   └── styles/
│       └── globals.css             # Global Tailwind styles
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── migrations/                 # Migration history
├── public/                         # Static assets
├── middleware.js                   # Rate limiting middleware
├── docker-compose.yml              # Local development setup
├── Dockerfile                      # Container definition
└── package.json                    # Dependencies and scripts
```

## Core Architecture Patterns

### Frontend/Backend Separation

BitcoinLink uses Next.js's integrated architecture:

- **Pages (`/src/pages/*.js`)**: React components for UI rendering
- **API Routes (`/src/pages/api/*.js`)**: Serverless API endpoints
- **Shared Models (`/src/models/*.js`)**: Database access layer used by API routes

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│  API Route  │────▶│   Prisma    │
│   (React)   │◀────│  (Node.js)  │◀────│ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  NWC/Nostr  │
                    │   (WebLN)   │
                    └─────────────┘
```

### Security Model

1. **Encryption at Rest**: NWC URLs are encrypted with AES-256-CBC before database storage
2. **Secret in URL**: Decryption secrets are embedded in link URLs (never stored server-side)
3. **One-Time Use**: Links are deleted after successful payment
4. **Rate Limiting**: IP-based rate limiting via Upstash (5 requests per 10 seconds)

## Key Entry Points

| File | Purpose | HTTP Methods |
|------|---------|--------------|
| `src/pages/index.js` | Link generation UI | N/A (Page) |
| `src/pages/claim/[slug].js` | Link claiming UI | N/A (Page) |
| `src/pages/api/nwc/index.js` | Create NWC records | POST |
| `src/pages/api/links/index.js` | Create link records | POST |
| `src/pages/api/link/[slug].js` | API link generation | GET |
| `src/pages/api/claim/[slug].js` | Get link info / Execute payment | GET, POST |

## Database Schema

Two primary models with a one-to-many relationship:

```prisma
model NWC {
  id        String   @id @default(cuid())
  url       String                        // Encrypted NWC URL
  expiresAt DateTime
  maxAmount Int                           // Total sats budget
  numLinks  Int                           // Number of links from this NWC
  links     Link[]
}

model Link {
  id           String  @id @default(cuid())
  linkIndex    String  @unique @default(cuid())
  nwcId        String
  nwc          NWC     @relation(fields: [nwcId], references: [id])
  isClaimed    Boolean @default(false)
  wasServedAPI Boolean @default(false)
}
```

## Build and Run

```bash
# Development
npm run dev

# Production build
npm run build  # Runs: prisma generate && next build && prisma migrate deploy

# Start production server
npm start

# Docker (local development)
docker-compose up
```

## Environment Variables

Required environment variables (see `.env.sample`):

- `POSTGRES_PRISMA_URL` - PostgreSQL connection URL (pooled)
- `POSTGRES_URL_NON_POOLING` - PostgreSQL direct connection URL
- `KV_REST_API_URL` - Upstash KV REST API URL
- `KV_REST_API_TOKEN` - Upstash KV REST API token
