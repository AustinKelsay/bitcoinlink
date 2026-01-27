# Bitcoin & Lightning Network Context

## Bitcoin Overview

Bitcoin is a decentralized digital currency that operates without a central authority. Transactions are verified by network nodes through cryptography and recorded on a public distributed ledger called a blockchain.

**Key Properties:**
- Decentralized (no central authority)
- Limited supply (21 million BTC max)
- Pseudonymous (addresses not tied to identity)
- Irreversible transactions

## Lightning Network

### What is Lightning?

Lightning Network is a "Layer 2" payment protocol built on top of Bitcoin. It enables fast, cheap, and scalable Bitcoin transactions by creating payment channels between parties.

**Benefits:**
- Near-instant payments (milliseconds)
- Very low fees (fractions of a cent)
- High throughput (millions of transactions per second)
- Small payments viable (micropayments)

### How It Works

1. **Payment Channels:** Two parties lock Bitcoin in a multi-sig address
2. **Off-Chain Transactions:** Payments update channel balances without blockchain transactions
3. **Routing:** Payments route through network of connected channels
4. **Settlement:** Channels can close, settling final balances on-chain

### Units

| Unit | Satoshis | Bitcoin |
|------|----------|---------|
| 1 satoshi (sat) | 1 | 0.00000001 BTC |
| 1 millisatoshi (msat) | 0.001 | 0.00000000001 BTC |
| 1 Bitcoin (BTC) | 100,000,000 | 1 BTC |

**BitcoinLink uses satoshis (sats)** as the primary unit.

---

## Bolt11 Invoices

### What is Bolt11?

Bolt11 is the standard format for Lightning Network payment requests (invoices). An invoice contains all information needed to make a payment.

### Invoice Structure

```
lnbc10u1p0c8e7ypp5...
│    │  │
│    │  └─ Human-readable part (amount + unit)
│    └──── Network prefix (lnbc = mainnet)
└───────── Lightning payment prefix
```

### Invoice Components

| Field | Description |
|-------|-------------|
| Amount | Payment amount (optional, can be any-amount) |
| Payment Hash | 32-byte hash for payment verification |
| Timestamp | Creation time |
| Expiry | Seconds until invoice expires (default: 3600) |
| Description | Human-readable purpose |
| Payee | Recipient's public key |
| Route Hints | Optional routing information |

### Example Decoded Invoice

```javascript
{
  sections: [
    { name: 'timestamp', value: 1699876543 },
    { name: 'payment_hash', value: 'abc123...' },
    { name: 'amount', value: 10000000 },  // millisatoshis
    { tag: 'd', value: 'Coffee payment' },
    { name: 'expiry', value: 3600 }
  ]
}
```

### In BitcoinLink

BitcoinLink uses `light-bolt11-decoder` to:
- Parse invoices from recipients
- Validate invoice format
- Check expiration status

---

## Lightning Addresses

### What is a Lightning Address?

A Lightning address looks like an email address (user@domain.com) and provides a simple way to receive Lightning payments. It's built on the LNURL-pay protocol.

### How It Works

```
1. User has Lightning address: alice@wallet.com
2. Sender queries: https://wallet.com/.well-known/lnurlp/alice
3. Response includes callback URL and amount range
4. Sender requests invoice from callback with amount
5. Sender pays the received invoice
```

### LNURL-pay Response

```json
{
  "tag": "payRequest",
  "callback": "https://wallet.com/lnurlp/alice/callback",
  "minSendable": 1000,       // millisatoshis
  "maxSendable": 100000000,  // millisatoshis
  "metadata": "[[\"text/plain\",\"Alice's wallet\"]]"
}
```

### In BitcoinLink

Recipients can enter Lightning addresses to receive payments:

```typescript
// Parse Lightning address
const [username, domain] = input.split('@');

// Build LNURL-pay endpoint
const endpoint = `https://${domain}/.well-known/lnurlp/${username}`;

// Fetch callback URL
const { callback } = await fetch(endpoint).then(r => r.json());

// Get invoice for specific amount
const { pr: invoice } = await fetch(`${callback}?amount=${amountMsats}`)
  .then(r => r.json());
```

---

## LNURL Protocol

### What is LNURL?

LNURL is a set of protocols that simplify Lightning Network interactions using URLs encoded in bech32 format.

### Common LNURL Types

| Type | Tag | Purpose |
|------|-----|---------|
| LNURL-pay | payRequest | Receive payments |
| LNURL-withdraw | withdrawRequest | Send payments |
| LNURL-auth | login | Authentication |
| LNURL-channel | channelRequest | Open channels |

### LNURL Encoding

```typescript
// LNURL is a bech32-encoded URL
const lnurl = "LNURL1DP68GURN8GHJ7...";

// Decode to get actual URL
import { bech32 } from 'bech32';

const { words } = bech32.decode(lnurl, 2000);
const bytes = bech32.fromWords(words);
const url = new TextDecoder().decode(Uint8Array.from(bytes));
// Result: "https://wallet.com/lnurlp/alice"
```

### In BitcoinLink

Recipients can paste LNURL strings directly:

```typescript
if (input.toLowerCase().startsWith('lnurl')) {
  const decoded = decodeLnurl(input);
  // decoded = "https://wallet.com/lnurlp/..."
  return { type: 'lnurl', data: decoded };
}
```

---

## Nostr Wallet Connect (NWC)

### What is NWC?

NWC (NIP-47) is a protocol for remote wallet control over Nostr. It allows applications to request payments from a user's wallet without direct access to funds.

### NWC URL Format

```
nostr+walletconnect://pubkey?relay=wss://relay.com&secret=hex
│                    │       │                       │
│                    │       │                       └─ Client private key
│                    │       └───────────────────────── Relay for communication
│                    └───────────────────────────────── Wallet's public key
└────────────────────────────────────────────────────── Protocol identifier
```

### How NWC Works

```
1. User connects wallet to app via NWC URL
2. App stores encrypted NWC URL (in gift wrap event)
3. When payment needed:
   a. App creates NWC client with URL
   b. App sends pay_invoice request via Nostr
   c. Wallet receives request, executes payment
   d. Wallet sends response via Nostr
   e. App receives payment confirmation
```

### NWC Methods

| Method | Description |
|--------|-------------|
| `pay_invoice` | Pay a Bolt11 invoice |
| `make_invoice` | Create an invoice |
| `lookup_invoice` | Check invoice status |
| `get_balance` | Get wallet balance |
| `get_info` | Get wallet info |

### In BitcoinLink

**Generating NWC connection (Alby):**
```typescript
import { nwc } from '@getalby/sdk';

const newNwc = nwc.NWCClient.withNewSecret();
await newNwc.initNWC({
  name: 'bitcoinlink.app',
  requestMethods: ['pay_invoice'],
  maxAmount: amount,
  budgetRenewal: 'never',
  expiresAt: yearFromNow,
});
const nwcUrl = newNwc.getNostrWalletConnectUrl();
```

**Paying invoice (snstr):**
```typescript
import { NostrWalletConnectClient, parseNWCURL } from 'snstr';

const connectionOptions = parseNWCURL(nwcUrl);
const client = new NostrWalletConnectClient(connectionOptions);

await client.init();
const result = await client.payInvoice(invoice);
await client.disconnect();
```

### NWC Budget

NWC connections can have budgets:
- **maxAmount:** Total sats authorized
- **budgetRenewal:** `'never'`, `'daily'`, `'weekly'`, `'monthly'`
- **expiresAt:** Connection expiration time

BitcoinLink sets budget based on:
`numberOfLinks * satsPerLink`

---

## WebLN

### What is WebLN?

WebLN is a browser API specification for Lightning wallets. It allows web applications to interact with Lightning wallets through a standard interface.

### WebLN Methods

| Method | Description |
|--------|-------------|
| `enable()` | Request wallet access |
| `getInfo()` | Get node info |
| `sendPayment(invoice)` | Pay an invoice |
| `makeInvoice(args)` | Create an invoice |
| `signMessage(message)` | Sign a message |

### In BitcoinLink

Used for Alby wallet claiming:

```typescript
if (window?.webln) {
  await window.webln.enable();
  const result = await window.webln.makeInvoice({
    amount: linkInfo.amount,
    comment: 'BitcoinLink Reward',
  });
  // result.paymentRequest contains the invoice
}
```

---

## Bech32 Encoding

### What is Bech32?

Bech32 is an encoding format used in Bitcoin for SegWit addresses and in Lightning for LNURL encoding.

### Format

```
prefix1data
│      │
│      └─ Encoded data
└──────── Human-readable prefix
```

### In BitcoinLink

Used to decode LNURL strings:

```typescript
import { bech32 } from 'bech32';

const decodeLnurl = (lnurl: string): string | undefined => {
  try {
    const { words } = bech32.decode(lnurl, 2000);
    const bytes = bech32.fromWords(words);
    return new TextDecoder().decode(Uint8Array.from(bytes));
  } catch {
    return undefined;
  }
};
```
