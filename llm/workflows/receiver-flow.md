# Receiver Flow (Link Claiming)

## Overview

The receiver flow is how recipients claim Bitcoin payment links. The recipient provides a Lightning address, invoice, or LNURL, and receives Bitcoin directly to their wallet.

**No database. No API. Pure Nostr + NWC.**

---

## Visual Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RECEIVER FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. OPEN LINK                                                               │
│   ┌────────────────────────────────────────┐                                │
│   │  https://bitcoinlink.app/claim/eyJ...  │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼                                                    │
│   2. DECODE URL                                                              │
│   ┌────────────────────────────────────────┐                                │
│   │  eventId: "abc123..."                  │                                │
│   │  receiverPrivateKey: "def456..."       │                                │
│   │  relays: ["wss://relay.damus.io", ...] │                                │
│   │  amountSats: 1000                      │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼                                                    │
│   3. CHECK IF CLAIMED (NIP-09 deletion event)                               │
│   ┌────────────────────────────────────────┐                                │
│   │  Has deletion event? ───▶ Yes: Show "Claimed"                           │
│   │                       │                │                                │
│   │                       └── No: Continue │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼                                                    │
│   4. FETCH & DECRYPT GIFT WRAP                                              │
│   ┌────────────────────────────────────────┐                                │
│   │  Fetch event from relays               │                                │
│   │  Decrypt with receiver private key     │                                │
│   │  Extract: { nwcUrl, amount }           │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼                                                    │
│   5. USER ENTERS DESTINATION                                                 │
│   ┌────────────────────────────────────────┐                                │
│   │  [user@domain.com] or [lnbc...] or    │                                │
│   │  [LNURL1...]                           │                                │
│   │                                        │                                │
│   │         [Claim]                        │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼                                                    │
│   6. GET INVOICE (if needed)                                                 │
│   ┌────────────────────────────────────────┐                                │
│   │  Lightning address → Fetch via LNURL   │                                │
│   │  LNURL → Fetch callback                │                                │
│   │  Invoice → Use directly                │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼                                                    │
│   7. PAY INVOICE VIA NWC                                                     │
│   ┌────────────────────────────────────────┐                                │
│   │  payInvoiceWithNWC(nwcUrl, invoice)    │                                │
│   │  → Payment sent from sender's wallet   │                                │
│   │  → Preimage returned as proof          │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼                                                    │
│   8. PUBLISH DELETION EVENT (NIP-09)                                        │
│   ┌────────────────────────────────────────┐                                │
│   │  Mark link as claimed on relays        │                                │
│   │  Prevents double-claiming              │                                │
│   └────────────────────────────────────────┘                                │
│                         │                                                    │
│                         ▼                                                    │
│   9. SHOW SUCCESS                                                            │
│   ┌────────────────────────────────────────┐                                │
│   │  ✓ Link Claimed                        │                                │
│   └────────────────────────────────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## User Interface

**Location:** `src/pages/claim/[slug].tsx`

```text
┌─────────────────────────────────────────┐
│              Claim Link                  │
│                                          │
│         Status: Unclaimed (yellow)       │
│              1000 sats                   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ Enter Lightning Address, Bolt11  │   │
│  │ Invoice, or LNURL                │   │
│  │ [user@website.com or lnbc...]    │   │
│  └──────────────────────────────────┘   │
│                                          │
│         ┌──────────────┐                │
│         │    Claim     │                │
│         └──────────────┘                │
│                                          │
│                  OR                      │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │       Claim with Alby            │   │
│  │       Claim with Strike          │   │
│  │       Claim with Mutiny          │   │
│  │       Claim with CashApp         │   │
│  └──────────────────────────────────┘   │
│                                          │
└─────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: Decode URL and Load Data

```tsx
import { decodeLink, decryptBitcoinLink, BitcoinLinkNostrClient } from '@/lib/nostr';
import { getPublicKey } from 'snstr';

const router = useRouter();
const { slug } = router.query;  // The base64url encoded string

const fetchLinkData = async (encoded: string) => {
  // 1. Decode the URL
  const decoded = decodeLink(encoded);
  // decoded = { eventId, receiverPrivateKey, relays, amountSats }

  setLinkData(decoded);
  setLinkInfo({ amount: decoded.amountSats, isClaimed: false });

  // 2. Create client with relays from the link
  const client = new BitcoinLinkNostrClient(decoded.relays);

  try {
    await client.connect();

    // 3. Check for deletion event (already claimed?)
    const receiverPubkey = getPublicKey(decoded.receiverPrivateKey);
    const isDeletion = await client.hasDeletionEvent(decoded.eventId, receiverPubkey);

    if (isDeletion) {
      setClaimed(true);
      return;
    }

    // 4. Fetch the gift wrap event
    const event = await client.fetchEvent(decoded.eventId);
    if (!event) {
      setExists(false);
      return;
    }

    // 5. Decrypt to get payload
    const payload = decryptBitcoinLink(event, decoded.receiverPrivateKey);
    setPayload(payload);  // { type: 'bitcoinlink', nwcUrl, amount }
  } finally {
    client.close();
  }
};
```

---

### Step 2: Validate User Input

```tsx
const parseLightningAddress = (input: string): ParsedInput | false => {
  // LNURL (bech32 encoded URL)
  if (input.toLowerCase().startsWith('lnurl')) {
    const decoded = decodeLnurl(input);
    if (!decoded) return false;
    return { type: 'lnurl', data: decoded };
  }

  // Bolt11 invoice
  if (input.toLowerCase().startsWith('lnbc')) {
    const result = validateBolt11(input);
    if (!result.valid) {
      showToast('warn', 'Invalid Invoice', result.reason || 'Invalid invoice');
      return false;
    }
    return { type: 'invoice', data: input };
  }

  // Lightning address (email format)
  const [username, domain] = input.split('@');
  if (username && domain && domain.includes('.')) {
    return { type: 'address', data: input };
  }

  showToast('warn', 'Invalid Input', 'Invalid lightning address');
  return false;
};
```

---

### Step 3: Get Invoice

**From Lightning Address:**
```tsx
const getCallback = async (lnAddress: string): Promise<string | undefined> => {
  const lnurlpEndpoint = `https://${lnAddress.split('@')[1]}/.well-known/lnurlp/${lnAddress.split('@')[0]}`;
  const response = await fetch(lnurlpEndpoint);
  const data = await response.json();
  return data.callback;
};

const fetchInvoice = async ({ callback, amount }: { callback: string; amount: number }) => {
  const url = `${callback}?amount=${amount}&comment=BitcoinLink%20Reward`;
  const response = await fetch(url);
  const data = await response.json();
  return data.pr;  // Payment request (invoice)
};

// Usage
const callback = await getCallback(validInput.data);
const invoice = await fetchInvoice({
  callback,
  amount: linkInfo.amount * 1000  // sats to millisats
});
```

**From LNURL:**
```tsx
if (validInput.type === 'lnurl') {
  const response = await fetch(validInput.data);
  const lnurlPayData = await response.json();

  if (lnurlPayData.tag === 'payRequest') {
    const amount = linkInfo.amount * 1000;  // millisatoshis

    // Validate amount is within range
    if (amount >= lnurlPayData.minSendable && amount <= lnurlPayData.maxSendable) {
      const invoiceResponse = await fetch(`${lnurlPayData.callback}?amount=${amount}`);
      const invoiceData = await invoiceResponse.json();
      invoice = invoiceData.pr;
    }
  }
}
```

**From Bolt11 Invoice:**
```tsx
if (validInput.type === 'invoice') {
  invoice = validInput.data;  // Use directly
}
```

---

### Step 4: Execute Payment and Mark Claimed

```tsx
const payInvoiceAndMarkClaimed = async (invoice: string): Promise<boolean> => {
  if (!payload || !linkData) {
    showToast('error', 'Error', 'Link data not available');
    return false;
  }

  try {
    // 1. Pay the invoice using NWC
    await payInvoiceWithNWC(payload.nwcUrl, invoice);

    // 2. Publish deletion event to mark as claimed
    const client = new BitcoinLinkNostrClient(linkData.relays);
    try {
      await client.connect();
      await client.publishDeletion(linkData.eventId, linkData.receiverPrivateKey);
    } finally {
      client.close();
    }

    return true;
  } catch (error) {
    console.error('Payment error:', error);
    throw error;
  }
};
```

---

### Step 5: Success State

```tsx
try {
  await payInvoiceAndMarkClaimed(invoice);

  showToast('success', 'Payment Sent', 'The payment has been successfully sent.');
  showToast('success', 'Link Claimed', 'The link has been successfully claimed.');

  setTimeout(() => {
    setIsSubmitting(false);
    setClaimed(true);  // Updates UI to show "Claimed"
  }, 2000);
} catch (error) {
  // Handle errors
}
```

---

## Wallet-Specific Flows

### Alby (WebLN)

```tsx
const handleAlbySubmit = async () => {
  if (window?.webln) {
    await window.webln.enable();

    // Create invoice using WebLN
    const result = await window.webln.makeInvoice({
      amount: linkInfo.amount,
      comment: 'BitcoinLink Reward',
    });

    // Pay the invoice
    await payInvoiceAndMarkClaimed(result.paymentRequest);
  }
};
```

### Strike / CashApp / Mutiny

These wallets don't support WebLN, so they use instruction modals:

```tsx
<StrikeInstructions
  isVisible={isStrikeVisible}
  onHide={() => setIsStrikeVisible(false)}
  input={input}
  setInput={setInput}
  onSubmit={handleSubmit}
/>
```

The modals guide users to:
1. Open their wallet app
2. Find their Lightning address
3. Copy and paste it into the input field
4. Click Claim

---

## Error Handling

| Error | Cause | User Message |
|-------|-------|--------------|
| Link not found | Event doesn't exist on relays | "Link not found" |
| Already claimed | Deletion event exists | "Claimed" status |
| Insufficient budget | NWC budget depleted | "Insufficient Budget" |
| Amount out of range | LNURL limits | "Amount Out of Range" |
| Invalid input | Bad address/invoice | "Invalid Input" |
| Payment failed | Lightning routing error | "Error Sending Payment" |

```tsx
try {
  await payInvoiceAndMarkClaimed(invoice);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  if (errorMessage.includes('INSUFFICIENT_BALANCE')) {
    showToast('error', 'Insufficient Budget', 'Not enough budget remaining.');
  } else {
    showToast('error', 'Error Sending Payment', 'An error occurred.');
  }
}
```

---

## Link States

| State | Visual | Description |
|-------|--------|-------------|
| Loading | Spinner | Fetching event from relays |
| Unclaimed | Yellow "Unclaimed" | Ready to claim |
| Claiming | Spinner | Payment in progress |
| Claimed | Green "Claimed" | Successfully paid |
| Not Found | "Link not found" | Event missing or expired |

---

## Data Flow Summary

```text
URL → Decode → Check Deletion → Fetch Event → Decrypt → Get Invoice → Pay via NWC → Publish Deletion
  │      │           │              │            │            │              │              │
  │      │           │              │            │            │              │              └─ Nostr relay
  │      │           │              │            │            │              └─ NWC wallet
  │      │           │              │            │            └─ LNURL/address server
  │      │           │              │            └─ Client-side (snstr)
  │      │           │              └─ Nostr relay
  │      │           └─ Nostr relay
  │      └─ Client-side (base64url)
  └─ Browser
```

All operations are client-side except:
- Relay communication (fetch/publish events)
- NWC communication (pay invoice)
- LNURL/address servers (get invoice)
