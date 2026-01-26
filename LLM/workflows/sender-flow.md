# Sender Flow: Link Generation Workflow

## Overview

This document describes the workflow for generating payment links. Senders connect their Lightning wallet and create shareable links that recipients can claim.

---

## User Interface

### Home Page (`/`)

**Location:** `src/pages/index.js`

```
┌─────────────────────────────────────────┐
│            BitcoinLink                  │
│                                         │
│  Create single use non-custodial        │
│  bitcoin links redeemable via Lightning │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Number of links: [  10  ]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Sats per link:   [ 100  ]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Generate with Alby          │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │     Generate with Mutiny        │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Alby Wallet Flow

### Prerequisites
- Alby browser extension installed
- Wallet connected to Alby

### Step-by-Step Process

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. User     │────▶│  2. Alby     │────▶│  3. App      │
│  Input       │     │  Connection  │     │  Processing  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  6. Display  │◀────│  5. Generate │◀────│  4. Encrypt  │
│  Links       │     │  Links       │     │  NWC URL     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 1. User Input
```javascript
// State initialization
const [numberOfLinks, setNumberOfLinks] = useState(null);
const [satsPerLink, setSatsPerLink] = useState(null);

// Calculate total budget
const amount = numberOfLinks * satsPerLink;
```

### 2. Alby NWC Connection
```javascript
const handleAlbySubmit = async () => {
  const newNwc = nwc.NWCClient.withNewSecret();
  const yearFromNow = new Date();
  yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);

  const initNwcOptions = {
    name: "bitcoinlink.app",
    requestMethods: ['pay_invoice'],
    maxAmount: amount,
    editable: false,
    budgetRenewal: 'never',
    expiresAt: yearFromNow,
  };

  await newNwc.initNWC(initNwcOptions);  // Opens Alby popup
  const newNWCUrl = newNwc.getNostrWalletConnectUrl();
};
```

### 3. Encrypt NWC URL
```javascript
const encryptNWCUrl = (url) => {
  const secret = crypto.randomBytes(32).toString('hex');
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encryptedUrl = cipher.update(url, 'utf8', 'hex');
  encryptedUrl += cipher.final('hex');
  return { encryptedUrl, secret };
};
```

### 4. Create Database Records

**One-to-Many NWC (for API):**
```javascript
const generateOneToManyNWC = async (newNWCUrl) => {
  const { encryptedUrl, secret } = encryptNWCUrl(newNWCUrl);

  const createdNwc = await axios.post('/api/nwc', {
    url: encryptedUrl,
    maxAmount: amount,
    numLinks: numberOfLinks,
    expiresAt: yearFromNow,
  });

  return { oneToManyNwcId: createdNwc.data.id, oneToManySecret: secret };
};
```

**One-to-One Links (for sharing):**
```javascript
for (let i = 0; i < numberOfLinks; i++) {
  const { encryptedUrl, secret } = encryptNWCUrl(newNWCUrl);

  // Create NWC record
  const createdNwc = await axios.post('/api/nwc', {
    url: encryptedUrl,
    maxAmount: amount / numberOfLinks,
    numLinks: 1,
    expiresAt: yearFromNow,
  });

  // Generate link URL
  const linkIndex = uuidv4();
  const link = `bitcoinlink.app/claim/${createdNwc.data.id}?secret=${secret}&linkIndex=${linkIndex}`;

  // Create Link record
  await axios.post('/api/links', {
    nwcId: createdNwc.data.id,
    linkIndex: linkIndex,
  });

  links.push(link);
}
```

### 5. Display Links Modal
```javascript
setGeneratedLinks(links);
setLinkModalVisible(true);
showToast('success', 'Links Created', 'The links have been created successfully.');
```

---

## Mutiny Wallet Flow

### Prerequisites
- Mutiny wallet (web or mobile)
- No browser extension required

### Step-by-Step Process

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Open     │────▶│  2. Display  │────▶│  3. User     │
│  Modal       │     │  QR / Link   │     │  Approves    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  6. Generate │◀────│  5. Decrypt  │◀────│  4. Listen   │
│  Links       │     │  Response    │     │  for Event   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 1. Generate NWA URI
```javascript
// Generate app keypair
let sk = generatePrivateKey();
const appPublicKey = getPublicKey(sk);
const appPrivKey = sk.toString('hex');

// Create random secret
const secret = crypto.randomBytes(16).toString('hex');

// Build NWA URI
const nwaUri = `nostr+walletauth://${appPublicKey}?relay=${relayUrl}&secret=${secret}&required_commands=pay_invoice&budget=${budget}&identity=${identity}`;

// Build Mutiny settings URL
const mutinySettingsUrl = `https://app.mutinywallet.com/settings/connections?nwa=${encodedNwaUri}`;
```

### 2. Display QR Code
```javascript
<QRCodeSVG
  value={nwaUri}
  onClick={() => copyToClipboard(nwaUri)}
  size={400}
/>

<MutinyButton
  text="Open Mutiny Wallet"
  handleSubmit={handleOpenInBrowser}
/>
```

### 3. Subscribe to Nostr Events
```javascript
const { subscribeToEvents, fetchedEvents } = useSubscribetoEvents();

// Subscribe to NWA response events
subscribeToEvents([{
  kinds: [33194],
  since: Math.round(Date.now() / 1000),
  "#d": [appPublicKey]
}]);
```

### 4. Process Wallet Response
```javascript
useEffect(() => {
  fetchedEvents.forEach(async (event) => {
    if (event.tags[0][1] === appPublicKey) {
      // Decrypt NIP-04 encrypted content
      const decrypted = await nip04.decrypt(
        appPrivKey,
        event.pubkey,
        event.content
      );

      const { secret: responseSecret } = JSON.parse(decrypted);

      // Verify secret matches
      if (responseSecret === secret) {
        // Construct NWC URL
        const nwcUri = `nostr+walletconnect://${event.pubkey}?relay=${relayUrl}&pubkey=${appPublicKey}&secret=${appPrivKey}`;

        // Generate links
        await generateLinks(nwcUri);
      }
    }
  });
}, [fetchedEvents, secret]);
```

---

## Link Structure

### Generated Link URL

```
https://bitcoinlink.app/claim/{nwcId}?secret={secret}&linkIndex={linkIndex}
│                          │          │              │
│                          │          │              └─ Link identifier
│                          │          └──────────────── Decryption key
│                          └─────────────────────────── NWC record ID
└────────────────────────────────────────────────────── Base URL
```

### Link Parameters

| Parameter | Description | Source |
|-----------|-------------|--------|
| `nwcId` | Database ID of encrypted NWC | Prisma CUID |
| `secret` | AES-256-CBC decryption key | 32-byte random hex |
| `linkIndex` | Unique link identifier | UUID v4 |

---

## Database Records Created

### NWC Record
```json
{
  "id": "clwf9yz6n00001jgso4nmruxe",
  "url": "encrypted_nwc_url_hex...",
  "expiresAt": "2025-05-15T00:00:00.000Z",
  "maxAmount": 1000,
  "numLinks": 10
}
```

### Link Record
```json
{
  "id": "clwfa1234500001jgso4abcde",
  "linkIndex": "550e8400-e29b-41d4-a716-446655440000",
  "nwcId": "clwf9yz6n00001jgso4nmruxe",
  "isClaimed": false,
  "wasServedAPI": false
}
```

---

## Error Handling

### Common Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| Prompt closed | User cancelled Alby popup | Show warning toast |
| Error Creating NWC | Database error | Show error toast, retry |
| Error Creating Link | Database error | Show error toast, retry |
| No NWC url returned | Wallet connection failed | Show error toast |

### Error Handling Code

```javascript
try {
  await newNwc.initNWC(initNwcOptions);
  // ... success flow
} catch (e) {
  console.warn('Prompt closed', e);
  showToast('warn', 'Prompt Closed', 'The prompt was closed without completing the action.');
}
```
