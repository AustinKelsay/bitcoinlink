# LLM Documentation Structure Plan for Bitcoinlink

## Overview

Bitcoinlink is an open-source, non-custodial payment service that allows users to send Bitcoin via shareable links using the Lightning Network, powered by Nostr Wallet Connect (NWC). This plan outlines the creation of comprehensive LLM documentation.

## Directory Structure to Create

```
/LLM
├── implementation/
│   ├── overview.md           # High-level app architecture
│   ├── api-routes.md         # All API endpoints documentation
│   ├── database.md           # Database schema and models
│   ├── components.md         # Frontend components documentation
│   ├── hooks.md              # Custom React hooks
│   ├── utils.md              # Utility functions
│   └── security.md           # Security implementation (encryption, rate limiting)
├── context/
│   ├── project-overview.md   # What the project is, its purpose
│   ├── technologies.md       # All libraries, frameworks, dependencies
│   ├── bitcoin-lightning.md  # Lightning Network, NWC, Bolt11, LNURL explained
│   ├── nostr-protocol.md     # Nostr protocol usage and NWA authentication
│   └── deployment.md         # Docker, Vercel, database configuration
└── workflows/
    ├── sender-flow.md        # Link generation workflow (Alby & Mutiny)
    ├── receiver-flow.md      # Link claiming workflow
    └── api-integration.md    # Programmatic API integration workflow
```

## Documentation Content Plan

### Implementation Directory

1. **overview.md** - Document the overall application architecture:
   - Next.js project structure
   - Frontend/backend separation
   - Key directories and their purposes
   - File organization patterns

2. **api-routes.md** - Document all API endpoints:
   - `POST /api/nwc` - Create NWC record
   - `POST /api/links` - Create link record
   - `GET /api/link/[slug]` - Generate API link
   - `GET /api/claim/[slug]` - Get link info
   - `POST /api/claim/[slug]` - Claim link and send payment
   - Request/response formats, error codes, authentication

3. **database.md** - Document database layer:
   - Prisma schema (NWC and Link models)
   - Model functions (nwcModels.js, linkModels.js)
   - Relationships and constraints
   - PostgreSQL configuration

4. **components.md** - Document all React components:
   - Page components (index.js, claim/[slug].js)
   - Wallet buttons (AlbyButton, MutinyButton, StrikeButton, CashAppButton)
   - Modals (LinkModal, MutinyModal)
   - Instruction components (StrikeInstructions, CashAppInstructions, MutinyInstructions)
   - Props, state management, interactions

5. **hooks.md** - Document custom hooks:
   - useToast - Toast notification context
   - useSubscribeToEvents - Nostr event subscription
   - Usage patterns and dependencies

6. **utils.md** - Document utility functions:
   - bolt11.js - Invoice validation and parsing
   - Encryption/decryption functions
   - Helper functions

7. **security.md** - Document security implementation:
   - AES-256-CBC encryption for NWC URLs
   - Secret generation and handling
   - Rate limiting middleware
   - Referer checking
   - Non-custodial architecture

### Context Directory

1. **project-overview.md** - Project context:
   - What Bitcoinlink does
   - Problem it solves
   - Key features and capabilities
   - Non-custodial architecture explanation

2. **technologies.md** - Technology stack:
   - Next.js 14 and React 18
   - PrimeReact component library
   - Tailwind CSS styling
   - Prisma ORM
   - All npm dependencies with purposes

3. **bitcoin-lightning.md** - Bitcoin/Lightning context:
   - Lightning Network basics
   - Nostr Wallet Connect (NWC) protocol
   - Bolt11 invoice format
   - LNURL protocol
   - Lightning addresses
   - bech32 encoding

4. **nostr-protocol.md** - Nostr integration:
   - Nostr basics and relays
   - NIP-04 encryption
   - NWA (Nostr Wallet Auth) protocol
   - Event subscription and filtering
   - Wallet connection flow

5. **deployment.md** - Deployment context:
   - Docker Compose setup
   - Vercel deployment
   - Environment variables
   - Database configuration
   - Build and run scripts

### Workflows Directory

1. **sender-flow.md** - Link generation workflow:
   - User input (number of links, sats per link)
   - Alby wallet connection flow
   - Mutiny wallet connection flow (QR code, NWA)
   - NWC URL encryption process
   - Database record creation
   - Link generation output

2. **receiver-flow.md** - Link claiming workflow:
   - Link URL structure and parameters
   - Input validation (Lightning address, Bolt11, LNURL)
   - Invoice fetching process
   - Payment execution via NWC
   - Link deletion after successful claim
   - Wallet-specific instructions (Strike, CashApp, Mutiny, Alby)

3. **api-integration.md** - API integration workflow:
   - One-to-many NWC concept
   - API endpoint authentication
   - Programmatic link generation
   - Usage examples and code samples

## Execution Steps

1. Create `/LLM` directory
2. Create `/LLM/implementation` subdirectory
3. Create `/LLM/context` subdirectory
4. Create `/LLM/workflows` subdirectory
5. Write all implementation documentation files
6. Write all context documentation files
7. Write all workflow documentation files
8. Run notification command when complete
