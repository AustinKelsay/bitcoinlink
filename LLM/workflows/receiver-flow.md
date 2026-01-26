# Receiver Flow: Link Claiming Workflow

## Overview

This document describes the workflow for claiming payment links. Recipients enter their Lightning address, invoice, or LNURL to receive Bitcoin directly to their wallet.

---

## User Interface

### Claim Page (`/claim/[slug]`)

**Location:** `src/pages/claim/[slug].js`

```
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

## Claim Flow

### Step-by-Step Process

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Load     │────▶│  2. Validate │────▶│  3. Get      │
│  Link Info   │     │  Input       │     │  Invoice     │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  6. Success  │◀────│  5. Delete   │◀────│  4. Execute  │
│  State       │     │  Link        │     │  Payment     │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 1. Load Link Information

### URL Parameters
```javascript
const router = useRouter();
const { slug, linkIndex, secret } = router.query;
// slug = NWC record ID
// linkIndex = Link identifier
// secret = Decryption key
```

### Fetch Link Info
```javascript
useEffect(() => {
  const fetchLinkInfo = async () => {
    axios.get(`/api/claim/${slug}?linkIndex=${linkIndex}`)
      .then((res) => {
        setLinkInfo(res.data);
        // res.data = { amount: 1000, isClaimed: false }
        setClaimed(res.data.isClaimed);
      })
      .catch((err) => {
        if (err?.request?.status === 404) {
          setExists(false);  // Link not found or expired
        }
      });
  };

  if (slug && linkIndex) {
    fetchLinkInfo();
  }
}, [slug, linkIndex]);
```

---

## 2. Input Validation

### Parse Lightning Address
```javascript
const parseLightningAddress = (input) => {
  // LNURL (bech32 encoded URL)
  if (input.toLowerCase().startsWith('lnurl')) {
    const decoded = decodeLnurl(input);
    return { type: 'lnurl', data: decoded };
  }

  // Bolt11 invoice
  if (input.toLowerCase().startsWith('lnbc')) {
    const valid = validateBolt11(input);
    if (!valid) return false;
    return { type: 'invoice', data: input };
  }

  // Lightning address (email format)
  const [username, domain] = input.split('@');
  if (username && domain && domain.includes('.')) {
    return { type: 'address', data: input };
  }

  return false;
};
```

### Input Types

| Type | Format | Example |
|------|--------|---------|
| Lightning Address | user@domain.com | alice@getalby.com |
| Bolt11 Invoice | lnbc... | lnbc10u1p... |
| LNURL | LNURL1... | LNURL1DP68GURN... |

---

## 3. Get Invoice

### From Lightning Address
```javascript
const getCallback = async (lnAddress) => {
  const lnurlpEndpoint = `https://${lnAddress.split('@')[1]}/.well-known/lnurlp/${lnAddress.split('@')[0]}`;
  const response = await fetch(lnurlpEndpoint);
  const data = await response.json();
  return data.callback;
};

const fetchInvoice = async ({ callback, amount }) => {
  const url = `${callback}?amount=${amount}&comment=Reward`;
  const response = await fetch(url);
  const data = await response.json();
  return data.pr;  // Payment request (invoice)
};

// Usage
const callback = await getCallback(validInput.data);
const invoice = await fetchInvoice({
  callback: callback,
  amount: linkInfo.amount * 1000  // Convert to millisatoshis
});
```

### From LNURL
```javascript
if (validInput.type === 'lnurl') {
  const response = await fetch(validInput.data);
  const lnurlPayData = await response.json();

  if (lnurlPayData.tag === 'payRequest') {
    const amount = linkInfo.amount * 1000;  // millisatoshis

    // Validate amount is within range
    if (amount >= lnurlPayData.minSendable &&
        amount <= lnurlPayData.maxSendable) {
      const invoiceResponse = await fetch(
        `${lnurlPayData.callback}?amount=${amount}`
      );
      const invoiceData = await invoiceResponse.json();
      invoice = invoiceData.pr;
    }
  }
}
```

### From Bolt11 Invoice
```javascript
if (validInput.type === 'invoice') {
  invoice = validInput.data;  // Use directly
}
```

---

## 4. Execute Payment

### Submit to Claim API
```javascript
const claimresponse = await axios.post(
  `/api/claim/${slug}?linkIndex=${linkIndex}`,
  { invoice: invoice },
  {
    headers: {
      authorization: secret  // Decryption key
    }
  }
);
```

### Server-Side Payment Execution
```javascript
// src/pages/api/claim/[slug].js

const handlePostRequest = async (req, res) => {
  const { invoice } = req.body;
  const { slug, linkIndex } = req.query;
  const token = req.headers.authorization;

  // 1. Get NWC record
  const nwc = await getNwcById(slug);

  // 2. Validate invoice amount
  const amountPerLink = nwc.maxAmount / nwc.numLinks;
  const bolt11Amount = getBolt11Amount(invoice);
  if (bolt11Amount !== amountPerLink) {
    return res.status(400).json({ error: 'Invalid invoice amount' });
  }

  // 3. Decrypt NWC URL
  const decryptedUrl = decryptNWCUrl(nwc.url, token);

  // 4. Create NWC provider and send payment
  const nwcProvider = new webln.NostrWebLNProvider({
    nostrWalletConnectUrl: decryptedUrl
  });
  await nwcProvider.enable();
  const response = await nwcProvider.sendPayment(invoice);
  nwcProvider.close();

  // 5. Delete records on success
  if (response.preimage) {
    const link = await getLinkByNwcIdAndIndex(nwc.id, linkIndex);
    await deleteLink(link.id);
    await deleteNwc(slug);
    return res.status(200).json({ message: 'Payment successful', response });
  }
};
```

---

## 5. Success State

### Update UI
```javascript
if (claimresponse.status === 200) {
  showToast('success', 'Payment Sent', 'The payment has been successfully sent.');
  showToast('success', 'Link Claimed', 'The link has been successfully claimed.');

  setTimeout(() => {
    setIsSubmitting(false);
    setClaimed(true);  // Shows "Claimed" status
  }, 2000);
}
```

### Claimed State UI
```
┌─────────────────────────────────────────┐
│              Link Claimed                │
│                                          │
│         Status: Claimed (green)          │
│                                          │
└─────────────────────────────────────────┘
```

---

## Wallet-Specific Flows

### Alby (WebLN)
```javascript
const handleAlbySubmit = async () => {
  if (window && window.webln) {
    await window.webln.enable();

    // Create invoice using WebLN
    const result = await window.webln.makeInvoice({
      amount: linkInfo.amount,
      comment: "Reward"
    });

    // Submit invoice to claim API
    const claimresponse = await axios.post(
      `/api/claim/${slug}?linkIndex=${linkIndex}`,
      { invoice: result.paymentRequest },
      { headers: { authorization: secret } }
    );
  }
};
```

### Strike / CashApp / Mutiny
These wallets don't support WebLN, so they use instruction modals:

```javascript
// Show instructions modal
<StrikeInstructions
  isVisible={isStrikeVisible}
  onHide={() => setIsStrikeVisible(false)}
  input={input}
  setInput={setInput}
  onSubmit={handleSubmit}
/>
```

The instruction components guide users to:
1. Open their wallet app
2. Find their Lightning address
3. Copy and paste it into the input field
4. Submit the form

---

## Error Handling

### Error Types

| Error | Cause | User Message |
|-------|-------|--------------|
| Link not found | Already claimed or expired | "Link not found" |
| Invalid invoice amount | Amount mismatch | "Invalid Invoice Amount" |
| Insufficient budget | NWC budget depleted | "Insufficient Budget" |
| Amount out of range | LNURL limits | "Amount Out of Range" |
| Invalid input | Bad address/invoice | "Invalid Input" |

### Error Handling Code
```javascript
try {
  const claimresponse = await axios.post(...);
  // Success handling
} catch (error) {
  if (error.response?.data?.error === "Insufficient budget remaining") {
    showToast('error', 'Insufficient Budget', 'Not enough budget remaining.');
  } else if (error.response?.status === 400 &&
             error.response?.data?.error === "Invalid invoice amount") {
    showToast('warn', 'Invalid Invoice Amount', 'Amount does not match.');
  } else {
    showToast('error', 'Error Sending Payment', 'An error occurred.');
  }
}
```

---

## Link States

| State | Visual | Description |
|-------|--------|-------------|
| Unclaimed | Yellow "Unclaimed" | Ready to claim |
| Claiming | Spinner | Payment in progress |
| Claimed | Green "Claimed" | Successfully paid |
| Not Found | "Link not found" | Expired or already claimed |
