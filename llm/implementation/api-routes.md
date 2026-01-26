# API Routes Documentation

## Overview

BitcoinLink exposes four API endpoints that handle NWC record management, link creation, and payment execution.

## Endpoints

### POST /api/nwc

Creates a new NWC record with encrypted wallet connection URL.

**Request Body:**
```json
{
  "url": "string",        // AES-256-CBC encrypted NWC URL
  "maxAmount": 10000,     // Total sats budget
  "numLinks": 10,         // Number of links for this NWC
  "expiresAt": "ISO8601"  // Expiration timestamp
}
```

**Response (201):**
```json
{
  "id": "clwf9yz6n00001jgso4nmruxe"
}
```

**Error Responses:**
- `400` - Missing required fields
- `500` - Database error

**Location:** `src/pages/api/nwc/index.js`

---

### POST /api/links

Creates a new link record associated with an NWC.

**Request Body:**
```json
{
  "nwcId": "string",     // Parent NWC record ID
  "linkIndex": "string"  // Unique link identifier (UUID)
}
```

**Response (201):**
```json
{
  "id": "clwfa1234500001jgso4abcde"
}
```

**Error Responses:**
- `400` - Missing required fields
- `500` - Database error

**Location:** `src/pages/api/links/index.js`

---

### GET /api/link/[slug]

Generates a new link for programmatic/API access from a one-to-many NWC.

**URL Parameters:**
- `slug` - NWC record ID

**Headers:**
- `Authorization` - Decryption secret for the NWC URL

**Response (200):**
```json
{
  "link": "bitcoinlink.app/claim/{nwcId}?secret={secret}&linkIndex={linkIndex}"
}
```

**Error Responses:**
- `400` - NWC has no remaining links
- `401` - Missing authorization header
- `404` - NWC not found
- `500` - Server error

**Location:** `src/pages/api/link/[slug].js`

---

### GET /api/claim/[slug]

Retrieves link information for the claim page.

**URL Parameters:**
- `slug` - NWC record ID

**Query Parameters:**
- `linkIndex` - Unique link identifier

**Response (200):**
```json
{
  "amount": 1000,        // Sats per link (maxAmount / numLinks)
  "isClaimed": false
}
```

**Error Responses:**
- `404` - NWC or Link not found
- `500` - Server error

**Location:** `src/pages/api/claim/[slug].js`

---

### POST /api/claim/[slug]

Executes payment via NWC and marks link as claimed.

**URL Parameters:**
- `slug` - NWC record ID

**Query Parameters:**
- `linkIndex` - Unique link identifier

**Headers:**
- `Authorization` - Decryption secret for the NWC URL

**Request Body:**
```json
{
  "invoice": "lnbc..."  // Bolt11 invoice from recipient
}
```

**Response (200):**
```json
{
  "message": "Payment successful",
  "response": {
    "preimage": "abc123..."
  }
}
```

**Error Responses:**
- `400` - Invalid invoice amount, Link already claimed, Insufficient budget
- `404` - NWC or Link not found
- `500` - Decryption error, Payment error, Deletion error

**Location:** `src/pages/api/claim/[slug].js`

## Payment Flow

```
1. Client sends POST /api/claim/[slug] with invoice
2. Server validates NWC exists
3. Server calculates expected amount (maxAmount / numLinks)
4. Server validates invoice amount matches expected
5. Server decrypts NWC URL using Authorization header
6. Server creates NWC WebLN provider
7. Server sends payment via NWC
8. On success (preimage returned):
   - Delete Link record
   - Delete NWC record (for 1:1 links)
9. Return success with preimage
```

## Rate Limiting

All endpoints are protected by Upstash rate limiting middleware:
- **Limit:** 5 requests per 10 seconds per IP
- **Implementation:** `middleware.js` using `@upstash/ratelimit`

## Authentication

- Links include a `secret` query parameter used for decryption
- API endpoint (`/api/link/[slug]`) requires `Authorization` header
- No traditional user authentication - security via encrypted secrets
