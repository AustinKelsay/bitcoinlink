# API Integration Workflow

## Overview

BitcoinLink provides a programmatic API for generating payment links. This allows developers to integrate link generation into their applications, automate reward distribution, or build custom workflows.

---

## One-to-Many NWC Concept

When generating links, BitcoinLink creates two types of NWC records:

### One-to-One NWC
- Each link has its own encrypted NWC URL
- NWC deleted when link is claimed
- Used for manually shared links

### One-to-Many NWC
- Single encrypted NWC URL for all links
- Links generated on-demand via API
- NWC persists until all links claimed
- Used for programmatic access

```
┌─────────────────────────────────────────────────────────┐
│                    One-to-Many NWC                       │
│  Budget: 10,000 sats | Links: 100                       │
├─────────────────────────────────────────────────────────┤
│  GET /api/link/{nwcId}  ────▶  Link 1 (100 sats)       │
│  GET /api/link/{nwcId}  ────▶  Link 2 (100 sats)       │
│  GET /api/link/{nwcId}  ────▶  Link 3 (100 sats)       │
│           ...                       ...                  │
│  GET /api/link/{nwcId}  ────▶  Link 100 (100 sats)     │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoint

### GET /api/link/[slug]

Generates a new claimable link from the one-to-many NWC.

**Location:** `src/pages/api/link/[slug].js`

#### Request

```http
GET /api/link/{nwcId} HTTP/1.1
Host: bitcoinlink.app
Authorization: {secret}
```

| Parameter | Location | Description |
|-----------|----------|-------------|
| `nwcId` | URL path | The one-to-many NWC record ID |
| `secret` | Header | The decryption secret |

#### Response

**Success (200):**
```json
{
  "link": "bitcoinlink.app/claim/{nwcId}?secret={secret}&linkIndex={linkIndex}"
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | "NWC has no remaining links" | All links have been generated |
| 401 | "Unauthorized" | Missing or invalid Authorization header |
| 404 | "NWC not found" | Invalid NWC ID |
| 500 | Server error | Internal error |

---

## Integration Setup

### Step 1: Generate Links via UI

1. Visit bitcoinlink.app
2. Enter number of links and sats per link
3. Connect wallet (Alby or Mutiny)
4. After links are generated, switch to "API Integration" tab

### Step 2: Retrieve API Credentials

The LinkModal displays API credentials:

```
┌─────────────────────────────────────────────────────────┐
│  API Integration                                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  To generate links programmatically, use the API         │
│  endpoint below with the provided secret.                │
│                                                          │
│  WARNING: The secret is only shown once!                 │
│                                                          │
│  API Endpoint:                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ GET https://bitcoinlink.app/api/link/{nwcId}    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Secret:                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ a1b2c3d4e5f6...                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  To get a link, make a GET request to the API URL        │
│  with the secret in the Authorization header.            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Store Credentials Securely

```javascript
// Store these securely (environment variables, secrets manager, etc.)
const API_ENDPOINT = "https://bitcoinlink.app/api/link/clwf9yz6n00001jgso4nmruxe";
const API_SECRET = "a1b2c3d4e5f6789...";
```

---

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_ENDPOINT = process.env.BITCOINLINK_API_ENDPOINT;
const API_SECRET = process.env.BITCOINLINK_API_SECRET;

async function generatePaymentLink() {
  try {
    const response = await axios.get(API_ENDPOINT, {
      headers: {
        'Authorization': API_SECRET
      }
    });

    const link = `https://${response.data.link}`;
    console.log('Generated link:', link);
    return link;
  } catch (error) {
    if (error.response?.status === 400) {
      console.error('No remaining links');
    } else {
      console.error('Error generating link:', error.message);
    }
    throw error;
  }
}

// Usage
const link = await generatePaymentLink();
```

### Python

```python
import requests
import os

API_ENDPOINT = os.environ.get('BITCOINLINK_API_ENDPOINT')
API_SECRET = os.environ.get('BITCOINLINK_API_SECRET')

def generate_payment_link():
    response = requests.get(
        API_ENDPOINT,
        headers={'Authorization': API_SECRET}
    )

    if response.status_code == 200:
        link = f"https://{response.json()['link']}"
        print(f'Generated link: {link}')
        return link
    elif response.status_code == 400:
        raise Exception('No remaining links')
    else:
        raise Exception(f'Error: {response.status_code}')

# Usage
link = generate_payment_link()
```

### cURL

```bash
curl -X GET \
  "https://bitcoinlink.app/api/link/{nwcId}" \
  -H "Authorization: {secret}"
```

---

## Use Cases

### Automated Rewards Distribution

```javascript
async function distributeRewards(userEmails) {
  const links = [];

  for (const email of userEmails) {
    const link = await generatePaymentLink();
    links.push({ email, link });

    // Send email with link
    await sendEmail(email, {
      subject: 'Your Bitcoin Reward!',
      body: `Claim your sats: ${link}`
    });
  }

  return links;
}
```

### Contest/Giveaway Bot

```javascript
// Discord bot example
client.on('messageCreate', async (message) => {
  if (message.content === '!claimreward') {
    try {
      const link = await generatePaymentLink();
      await message.author.send(`Here's your Bitcoin: ${link}`);
      await message.reply('Check your DMs!');
    } catch (error) {
      await message.reply('No rewards remaining!');
    }
  }
});
```

### Webhook Integration

```javascript
// Stripe webhook - reward customers after purchase
app.post('/webhook/stripe', async (req, res) => {
  const event = req.body;

  if (event.type === 'checkout.session.completed') {
    const customerEmail = event.data.object.customer_email;
    const link = await generatePaymentLink();

    await sendThankYouEmail(customerEmail, link);
  }

  res.status(200).send('OK');
});
```

---

## Server-Side Implementation

### API Handler

**Location:** `src/pages/api/link/[slug].js`

```javascript
import { getNwcById } from "@/models/nwcModels";
import { createLink, getLinkCountByNwcId } from "@/models/linkModels";
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;
  const secret = req.headers.authorization;

  if (!secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const nwc = await getNwcById(slug);

    if (!nwc) {
      return res.status(404).json({ error: 'NWC not found' });
    }

    // Check if links remaining
    const linkCount = await getLinkCountByNwcId(nwc.id);
    if (linkCount >= nwc.numLinks) {
      return res.status(400).json({ error: 'NWC has no remaining links' });
    }

    // Create new link
    const linkIndex = uuidv4();
    await createLink({
      nwcId: nwc.id,
      linkIndex: linkIndex,
      wasServedAPI: true
    });

    // Return link URL
    const link = `bitcoinlink.app/claim/${nwc.id}?secret=${secret}&linkIndex=${linkIndex}`;

    return res.status(200).json({ link });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

## Rate Limiting

API requests are subject to rate limiting:
- **Limit:** 5 requests per 10 seconds per IP
- **Response:** 429 Too Many Requests

```javascript
// Handle rate limiting
async function generateWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generatePaymentLink();
    } catch (error) {
      if (error.response?.status === 429) {
        // Wait and retry
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Best Practices

1. **Store credentials securely** - Use environment variables or secrets manager
2. **Handle errors gracefully** - Check for "no remaining links" and other errors
3. **Implement retry logic** - Handle rate limiting with backoff
4. **Track link usage** - Log generated links for auditing
5. **Set appropriate budgets** - Calculate total sats needed before generating NWC
6. **Monitor expiration** - NWC connections expire after 1 year by default
