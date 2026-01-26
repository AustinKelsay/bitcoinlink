# Database Documentation

## Overview

BitcoinLink uses PostgreSQL with Prisma ORM for data persistence. The schema consists of two models representing wallet connections (NWC) and individual payment links.

## Prisma Configuration

**Location:** `prisma/schema.prisma`

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-1.1.x"]
}
```

## Models

### NWC (Nostr Wallet Connect)

Stores encrypted wallet connection URLs and budget information.

```prisma
model NWC {
  id        String   @id @default(cuid())
  url       String                        // Encrypted NWC URL
  expiresAt DateTime                      // Connection expiration
  maxAmount Int                           // Total sats budget
  numLinks  Int                           // Number of links
  links     Link[]                        // Related links
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier (CUID) |
| `url` | String | AES-256-CBC encrypted NWC URL |
| `expiresAt` | DateTime | Wallet connection expiration |
| `maxAmount` | Int | Total satoshi budget for all links |
| `numLinks` | Int | Number of payment links created |
| `links` | Link[] | One-to-many relation to Link model |

### Link

Represents individual payment links associated with an NWC.

```prisma
model Link {
  id           String  @id @default(cuid())
  linkIndex    String  @unique @default(cuid())
  nwcId        String
  nwc          NWC     @relation(fields: [nwcId], references: [id])
  isClaimed    Boolean @default(false)
  wasServedAPI Boolean @default(false)
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier (CUID) |
| `linkIndex` | String | Unique index for URL routing |
| `nwcId` | String | Foreign key to NWC |
| `nwc` | NWC | Many-to-one relation to NWC model |
| `isClaimed` | Boolean | Whether link has been redeemed |
| `wasServedAPI` | Boolean | Whether link was generated via API |

## Model Functions

### NWC Models

**Location:** `src/models/nwcModels.js`

```javascript
// Create new NWC record
createNwc({ url, expiresAt, maxAmount, numLinks }) → NWC

// Get NWC by ID
getNwcById(id) → NWC | null

// Delete NWC by ID
deleteNwc(id) → NWC
```

### Link Models

**Location:** `src/models/linkModels.js`

```javascript
// Get all links with NWC details
getAllLinks() → Link[]

// Create new link record
createLink({ nwcId, linkIndex, isClaimed?, wasServedAPI? }) → Link

// Get link by NWC ID and link index
getLinkByNwcIdAndIndex(nwcId, linkIndex) → Link | null

// Get first unclaimed, unserved link for an NWC
getNewLink(nwcId) → Link | null

// Mark link as served via API
markLinkServed(id) → Link

// Claim a link (mark as claimed using nwcId and linkIndex)
claimLink(nwcId, linkIndex) → { count: number }

// Delete link by ID
deleteLink(id) → Link
```

**Note:** `claimLink` uses `updateMany` with filters to ensure only unclaimed links are updated:
```javascript
export const claimLink = async (nwcId, linkIndex) => {
    return await prisma.Link.updateMany({
        where: {
            nwcId,
            linkIndex,
            isClaimed: false // Ensure we only update unclaimed links
        },
        data: {
            isClaimed: true
        }
    });
};
```

### Prisma Client

**Location:** `src/models/prisma.js`

Singleton pattern for Prisma client to prevent connection pool exhaustion in development:

```javascript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

## Database Operations Flow

### Link Creation
```
1. Encrypt NWC URL with random secret
2. Create NWC record with encrypted URL
3. Create Link record with reference to NWC
4. Return shareable URL with secret in query params
```

### Link Claiming
```
1. Fetch NWC by slug (ID)
2. Fetch Link by NWC ID and linkIndex
3. Validate link not already claimed
4. Execute payment
5. Delete Link record
6. Delete NWC record (for 1:1 links)
```

## Relationships

```
NWC (1) ──────────── (*) Link
     │                   │
     │ id ◄──────── nwcId│
     │                   │
     └───────────────────┘
```

- One NWC can have many Links
- Each Link belongs to exactly one NWC
- Links are deleted when claimed
- NWC is deleted when all links are claimed (1:1 mode)

## Migration Commands

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev

# Deploy migrations (production)
npx prisma migrate deploy

# Reset database (development)
npx prisma migrate reset
```
