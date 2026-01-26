# Security Implementation

## Overview

BitcoinLink implements a non-custodial security model where the service never holds users' Bitcoin. Security is achieved through encryption, single-use links, and rate limiting.

## Non-Custodial Architecture

BitcoinLink never has access to user funds:

1. **Sender's wallet** holds the Bitcoin
2. **NWC connection** authorizes payments from sender's wallet
3. **Payment** goes directly from sender's wallet to recipient
4. **Service** only facilitates the connection

```
Sender's Wallet ──NWC Protocol──▶ BitcoinLink ──Lightning──▶ Recipient's Wallet
       │                              │
       │                              │
       ▼                              ▼
   Holds funds               Never holds funds
```

## Encryption

### AES-256-CBC for NWC URLs

NWC URLs contain sensitive wallet connection credentials and are encrypted before storage.

**Encryption (client-side):**
```javascript
// Location: src/pages/index.js
const encryptNWCUrl = (url) => {
  const secret = crypto.randomBytes(32).toString('hex');
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encryptedUrl = cipher.update(url, 'utf8', 'hex');
  encryptedUrl += cipher.final('hex');
  return { encryptedUrl, secret };
};
```

**Decryption (server-side):**
```javascript
// Location: src/pages/api/claim/[slug].js
const decryptNWCUrl = (encryptedUrl, secret) => {
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decryptedUrl = decipher.update(encryptedUrl, 'hex', 'utf8');
  decryptedUrl += decipher.final('utf8');
  return decryptedUrl;
};
```

### Key Points

- **32-byte random secret** generated per NWC
- **Secret stored in URL only** (never in database)
- **Encrypted URL stored in database**
- **Decryption happens at claim time** using secret from URL

## Secret Handling

```
┌────────────────┐         ┌─────────────────┐
│   Generation   │         │    Database     │
├────────────────┤         ├─────────────────┤
│ Random secret  │         │ Encrypted URL   │
│ generated      │────────▶│ stored          │
│ client-side    │         │ (no secret)     │
└───────┬────────┘         └─────────────────┘
        │
        ▼
┌────────────────┐         ┌─────────────────┐
│   Shareable    │         │   Claim Time    │
│   Link         │         ├─────────────────┤
├────────────────┤         │ Secret from URL │
│ Contains:      │────────▶│ decrypts NWC    │
│ - NWC ID       │         │ URL for payment │
│ - Secret       │         └─────────────────┘
│ - Link Index   │
└────────────────┘
```

## Rate Limiting

**Location:** `middleware.js`

Uses Upstash sliding window rate limiting:

```javascript
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
});

// Applied to all API routes
const { success } = await ratelimit.limit(ip);
```

**Configuration:**
- **Limit:** 5 requests
- **Window:** 10 seconds
- **Scope:** Per IP address
- **Storage:** Vercel KV (Redis)

## Referer Validation

**Location:** `middleware.js`

The middleware enforces referer header validation to prevent unauthorized API access:

```javascript
const allowedBaseReferer = 'https://www.bitcoinlink.app';

// Bypass for production hostnames
if (hostname === 'www.bitcoinlink.app' || hostname === 'bitcoinlink.app') {
  return NextResponse.next();
}

// Bypass referer check for /link paths (only rate limited)
if (request.nextUrl.pathname.startsWith('/link')) {
  const { success } = await ratelimit.limit(ip);
  return success ? NextResponse.next() : NextResponse.redirect(new URL('/blocked', request.url));
}

// Apply referer check for all other routes
if (!referer.startsWith(allowedBaseReferer)) {
  return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
}
```

**Configuration:**
- **Allowed Referer:** `https://www.bitcoinlink.app`
- **Bypass:** Requests from production hostnames (`www.bitcoinlink.app`, `bitcoinlink.app`)
- **Bypass:** Paths starting with `/link` (only rate limited, no referer check)
- **Response:** 403 Forbidden with JSON error if referer doesn't match

## Invoice Validation

Before executing payment, the server validates the invoice:

```javascript
// Location: src/pages/api/claim/[slug].js
const amountPerLink = nwc.maxAmount / nwc.numLinks;
const bolt11Amount = getBolt11Amount(invoice);

if (bolt11Amount !== amountPerLink) {
  return res.status(400).json({ error: 'Invalid invoice amount' });
}
```

This prevents:
- Overpayment attacks
- Underpayment attempts
- Invoice manipulation

## Single-Use Links

Links are deleted immediately after successful payment:

```javascript
// After successful payment
const deletedLink = await deleteLink(link.id);

// For 1:1 links, also delete NWC
const deleted = await deleteNwc(slug);
```

**Protection against:**
- Double-spending
- Link reuse
- Replay attacks

## Input Validation

### Lightning Address Parsing

**Location:** `src/pages/claim/[slug].js`

```javascript
const parseLightningAddress = (input) => {
  // LNURL validation
  if (input.toLowerCase().startsWith('lnurl')) {
    const decoded = decodeLnurl(input);
    return { type: 'lnurl', data: decoded };
  }

  // Bolt11 invoice validation
  if (input.toLowerCase().startsWith('lnbc')) {
    const valid = validateBolt11(input);
    return { type: 'invoice', data: input };
  }

  // Lightning address validation
  const [username, domain] = input.split('@');
  if (username && domain && domain.includes('.')) {
    return { type: 'address', data: input };
  }

  return false;
};
```

## Security Checklist

| Threat | Mitigation |
|--------|------------|
| Fund custody | Non-custodial NWC architecture |
| Credential theft | AES-256-CBC encryption |
| Database breach | Secrets not stored in DB |
| Brute force | Rate limiting (5/10s) |
| Unauthorized API access | Referer validation |
| Invoice manipulation | Amount validation |
| Link reuse | Single-use deletion |
| Replay attacks | Link deletion after claim |

## Recommendations

1. **HTTPS Required**: All production traffic must use HTTPS
2. **Secret Rotation**: Consider shorter NWC expiration times
3. **Monitoring**: Log failed claim attempts for analysis
4. **Budget Limits**: Set reasonable maxAmount limits
