# Sender Flow (Link Creation)

## Overview

The sender flow is how users create Bitcoin payment links. The sender connects their wallet, sets the amount and number of links, and receives shareable URLs.

**No database. No API. Pure Nostr.**

---

## Visual Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SENDER FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. USER INPUT                                                              │
│   ┌────────────────────────────────────────┐                                │
│   │  Number of links: [    5    ]          │                                │
│   │  Sats per link:   [  1000   ]          │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼                                                    │
│   2. WALLET CONNECTION                                                       │
│   ┌────────────────────────────────────────┐                                │
│   │  [Generate with Alby]                  │──────┐                         │
│   │  [Generate with Mutiny]                │──────┤                         │
│   └────────────────────────────────────────┘      │                         │
│                                                    ▼                         │
│   3. WALLET APPROVAL                                                         │
│   ┌────────────────────────────────────────┐                                │
│   │  App: bitcoinlink.app                  │                                │
│   │  Permission: pay_invoice               │                                │
│   │  Budget: 5000 sats/year                │                                │
│   │                                        │                                │
│   │         [Approve]  [Deny]              │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼ (NWC URL)                                         │
│   4. LINK GENERATION (for each link)                                        │
│   ┌────────────────────────────────────────┐                                │
│   │  a. Create payload { nwcUrl, amount }  │                                │
│   │  b. Generate receiver keypair          │                                │
│   │  c. Gift-wrap payload (NIP-17)         │                                │
│   │  d. Publish event to Nostr relays      │                                │
│   │  e. Create URL with private key        │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼                                                    │
│   5. DISPLAY LINKS                                                           │
│   ┌────────────────────────────────────────┐                                │
│   │  Generated Links:                      │                                │
│   │                                        │                                │
│   │  https://bitcoinlink.app/claim/eyJ...  │                                │
│   │  https://bitcoinlink.app/claim/eyK...  │                                │
│   │  https://bitcoinlink.app/claim/eyL...  │                                │
│   │                                        │                                │
│   │         [Copy All]                     │                                │
│   └────────────────────────────────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: User Input

**Location:** `src/pages/index.tsx`

```tsx
const [numberOfLinks, setNumberOfLinks] = useState<number | null>(null);
const [satsPerLink, setSatsPerLink] = useState<number | null>(null);

// Input fields
<InputNumber
  id="number"
  value={numberOfLinks}
  onValueChange={(e) => setNumberOfLinks(e.value ?? null)}
  min={1}
  max={1000}
/>
<InputNumber
  id="sats"
  value={satsPerLink}
  onValueChange={(e) => setSatsPerLink(e.value ?? null)}
/>
```

---

### Step 2: Wallet Connection

#### Alby Flow

```tsx
import { nwc } from '@getalby/sdk';

const handleAlbySubmit = async () => {
  // Validate inputs
  if (!numberOfLinks || numberOfLinks < 1) {
    showToast('warn', 'Invalid Input', 'Please enter a valid number of links.');
    return;
  }

  // Create NWC client
  const newNwc = nwc.NWCClient.withNewSecret();
  const yearFromNow = new Date();
  yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
  const amount = numberOfLinks * satsPerLink;

  // Open Alby connection window
  await newNwc.initNWC({
    name: 'bitcoinlink.app',
    requestMethods: ['pay_invoice'],
    maxAmount: amount,
    editable: false,
    budgetRenewal: 'never',
    expiresAt: yearFromNow,
  });

  // Get NWC URL
  const nwcUrl = newNwc.getNostrWalletConnectUrl();

  // Generate links
  const links = await generateLinksFromNWC(nwcUrl);
  setGeneratedLinks(links);
  setLinkModalVisible(true);
};
```

#### Mutiny Flow (NWA Protocol)

Mutiny uses Nostr Wallet Auth (NWA)—a QR code / deep link flow:

**Location:** `src/components/mutiny/MutinyModal.tsx`

```tsx
import { generateKeypair } from 'snstr';
import { nip04 } from 'nostr-tools';

// 1. Generate keypair and NWA URI
const keypair = await generateKeypair();
const budget = `${numberOfLinks * satsPerLink}/year`;
const nwaUri = `nostr+walletauth://${keypair.publicKey}?relay=${relayUrl}&secret=${keypair.privateKey}&required_commands=pay_invoice&budget=${budget}`;

// 2. Display QR code for mobile scanning
<QRCodeSVG value={nwaUri} />

// 3. Or open Mutiny in browser popup
<MutinyButton text="Open Mutiny Wallet" handleSubmit={() => {
  window.open(mutinySettingsUrl, 'mutinyWindow', 'width=600,height=700');
}} />

// 4. Subscribe to wallet response events (kind 33194)
subscribeToEvents([{
  kinds: [33194],
  since: Math.round(Date.now() / 1000),
  '#d': [appPublicKey],
}]);

// 5. Process response when received
fetchedEvents.forEach(async (event) => {
  // Decrypt NIP-04 encrypted response
  const decrypted = await nip04.decrypt(appPrivKey, event.pubkey, event.content);
  const { secret } = JSON.parse(decrypted);

  // Construct NWC URL from response
  const nwcUri = `nostr+walletconnect://${event.pubkey}?relay=${relayUrl}&pubkey=${appPublicKey}&secret=${appPrivKey}`;

  // Generate links using the shared utility
  const links = await generateLinksFromNWC({
    nwcUrl: nwcUri,
    numberOfLinks,
    satsPerLink,
  });
});
```

---

### Step 3: Link Generation

**Location:** `src/lib/nostr/link-generator.ts` (shared utility)

The link generation logic is encapsulated in a shared function used by both Alby and Mutiny flows:

```tsx
import { generateLinksFromNWC } from '@/lib/nostr';

// In handleAlbySubmit (index.tsx):
const links = await generateLinksFromNWC({
  nwcUrl: newNWCUrl,
  numberOfLinks: numberOfLinks,
  satsPerLink: satsPerLink,
});
```

**Under the hood** (`src/lib/nostr/link-generator.ts`):

```tsx
export async function generateLinksFromNWC(
  options: GenerateLinksOptions
): Promise<string[]> {
  const { nwcUrl, numberOfLinks, satsPerLink, relays } = options;

  // Input validation (tested extensively)
  if (numberOfLinks < 1) throw new Error('numberOfLinks must be at least 1');
  if (satsPerLink < 1) throw new Error('satsPerLink must be at least 1');

  const client = new BitcoinLinkNostrClient(relays);
  const links: string[] = [];

  try {
    await client.connect();

    for (let i = 0; i < numberOfLinks; i++) {
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl,
        amount: satsPerLink,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      await client.publish(giftWrap);

      links.push(createClaimUrl(
        giftWrap.id,
        receiverPrivateKey,
        satsPerLink,
        client.getRelays()
      ));
    }

    return links;
  } finally {
    client.close();
  }
}
```

---

### Step 4: Display Links

**Location:** `src/components/LinkModal.tsx`

```tsx
<Dialog header="Generated Links" visible={linkModalVisible}>
  <Button label="Copy All" onClick={copyAllLinks} />
  {generatedLinks.map((link, index) => (
    <div key={index}>
      <a href={link} target="_blank">{link}</a>
      <Button icon="pi pi-copy" onClick={() => copyToClipboard(link)} />
    </div>
  ))}
</Dialog>
```

---

## What Gets Created

### Gift Wrap Event (Published to Nostr Relays)

```json
{
  "kind": 1059,
  "pubkey": "ephemeral_sender_pubkey",
  "content": "<NIP-44 encrypted seal containing rumor>",
  "tags": [["p", "receiver_pubkey"]],
  "created_at": 1234567890,
  "id": "event_id_abc123",
  "sig": "signature"
}
```

Inside the encrypted content (the rumor):
```json
{
  "type": "bitcoinlink",
  "nwcUrl": "nostr+walletconnect://...",
  "amount": 1000
}
```

### Shareable URL

```
https://bitcoinlink.app/claim/eyJldmVudElkIjoiYWJjMTIz...
```

Decoded (base64url → JSON):
```json
{
  "eventId": "event_id_abc123",
  "receiverPrivateKey": "receiver_priv_key_def456",
  "relays": ["wss://relay.damus.io", "wss://nos.lol", ...],
  "amountSats": 1000
}
```

---

## Data Storage

### Where Data Lives

| Data | Location |
|------|----------|
| NWC URL + Amount | Encrypted in gift wrap event on Nostr relays |
| Receiver Private Key | Only in the shareable URL |
| Event ID | In URL and on relays |
| Relay List | In URL |

### Nothing Stored Server-Side

- No database records
- No API calls
- No session state
- Everything is on Nostr relays

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid input | Toast warning, prevent submission |
| Wallet declined | Toast warning, user can retry |
| Relay publish failed | Error toast, links not created |
| NWC connection timeout | Error toast, user can retry |

```tsx
try {
  await newNwc.initNWC(initNwcOptions);
} catch (e) {
  console.warn('Prompt closed', e);
  showToast('warn', 'Prompt Closed', 'The prompt was closed without completing.');
}
```

---

## Security Considerations

1. **NWC URL is sensitive** - Encrypted in gift wrap using NIP-17
2. **Private key only in URL** - Never stored; user must protect the link
3. **Ephemeral keypairs** - New keys for each link, no identity leak
4. **Budget limits** - User approves specific budget in wallet approval
5. **Timestamps randomized** - Gift wrap obfuscates creation time
