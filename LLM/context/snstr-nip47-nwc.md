# NIP-47: Nostr Wallet Connect - snstr Implementation

Nostr Wallet Connect (NWC) enables clients to access remote Lightning wallets through Nostr.

## Overview

NWC uses encrypted Nostr messages to send wallet commands:
- **Kind 13194**: Info Event - wallet capabilities
- **Kind 23194**: Request Event - client requests
- **Kind 23195**: Response Event - wallet responses

## Connection URL Format

```text
nostr+walletconnect://{walletPubkey}?relay={relayUrl}&secret={clientSecret}
```

Example:
```text
nostr+walletconnect://b889ff5b1513b641e2a139f661a661364979c5beee91842f8f0ef42ab558e9d4?relay=wss%3A%2F%2Frelay.damus.io&secret=71a8c14c1407c113601079c4302dab36460f0ccd0ad506f1f2dc73b5100e4f3c
```

## API

### parseNWCURL

```typescript
import { parseNWCURL } from 'snstr';

const options = parseNWCURL('nostr+walletconnect://...');
// Returns: {
//   walletPubkey: string,
//   relays: string[],
//   secret: string
// }
```

### NostrWalletConnectClient

```typescript
import { NostrWalletConnectClient, parseNWCURL } from 'snstr';

// Parse the connection URL
const options = parseNWCURL(nwcUrl);

// Create client
const client = new NostrWalletConnectClient(options);

// Initialize connection
await client.init();

// Pay an invoice
const result = await client.payInvoice(bolt11Invoice);
console.log('Preimage:', result.preimage);

// Clean up
await client.disconnect();
```

## Available Methods

### payInvoice

```typescript
const result = await client.payInvoice(bolt11Invoice);
// result.preimage - payment proof
```

### makeInvoice

```typescript
const invoice = await client.makeInvoice({
  amount: 1000,  // millisatoshis
  description: 'Payment for service'
});
// invoice.invoice - BOLT11 invoice string
```

### getBalance

```typescript
const balance = await client.getBalance();
// balance.balance - available balance in millisatoshis
```

### getInfo

```typescript
const info = await client.getInfo();
// info.alias, info.pubkey, etc.
```

## Bitcoinlink Usage

```typescript
import { NostrWalletConnectClient, parseNWCURL } from 'snstr';

export async function payInvoiceWithNWC(
  nwcUrl: string,
  invoice: string
): Promise<{ preimage: string }> {
  const options = parseNWCURL(nwcUrl);
  const client = new NostrWalletConnectClient(options);

  try {
    await client.init();
    const result = await client.payInvoice(invoice);
    
    if (!result?.preimage) {
      throw new Error('Payment failed: no preimage returned');
    }
    
    return { preimage: result.preimage };
  } finally {
    await client.disconnect();
  }
}
```

## Error Handling

```typescript
try {
  await client.payInvoice(invoice);
} catch (error) {
  // Error categories:
  // - UNAUTHORIZED: Invalid secret or permissions
  // - INSUFFICIENT_BALANCE: Not enough funds
  // - QUOTA_EXCEEDED: Rate limits hit
  // - NOT_FOUND: Invoice/payment not found
  // - PAYMENT_FAILED: Lightning payment failed
  // - INTERNAL: Wallet service error
}
```

## Common Error Types

| Error | Description |
|-------|-------------|
| `UNAUTHORIZED` | Invalid secret or client not authorized |
| `INSUFFICIENT_BALANCE` | Wallet doesn't have enough balance |
| `QUOTA_EXCEEDED` | Too many requests or amount exceeds limit |
| `PAYMENT_FAILED` | Lightning payment routing failed |
| `NOT_FOUND` | Invoice or payment not found |
| `INTERNAL` | Wallet service internal error |

## Validation

```typescript
import { parseNWCURL } from 'snstr';

export function isValidNWCUrl(nwcUrl: string): boolean {
  try {
    parseNWCURL(nwcUrl);
    return true;
  } catch {
    return false;
  }
}

export function getRelaysFromNWCUrl(nwcUrl: string): string[] {
  try {
    const options = parseNWCURL(nwcUrl);
    return options.relays;
  } catch {
    return [];
  }
}
```

## Security Notes

- The `secret` in the URL is the client's private key
- All messages are NIP-04 encrypted between client and wallet
- Never expose NWC URLs in logs or client-side storage
- NWC URLs should be treated like private keys
