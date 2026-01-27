# NIP-09: Event Deletion - snstr Implementation

Event deletion requests for marking links as claimed.

## Overview

NIP-09 defines kind 5 events for requesting deletion of other events.
Used in Bitcoinlink to mark links as "claimed" after payment.

## API

### createDeletionRequest

```typescript
import { createDeletionRequest } from 'snstr';

const deletionEvent = createDeletionRequest(
  {
    ids: [eventIdToDelete],     // Event IDs to delete
    content: 'Link claimed'      // Reason for deletion
  },
  authorPublicKey               // Must be same as original event author
);
// Returns: UnsignedEvent (kind 5)
```

### Full Signing Flow

```typescript
import { 
  createDeletionRequest, 
  getEventHash, 
  signEvent,
  NostrEvent 
} from 'snstr';

async function publishDeletion(
  eventId: string,
  privateKey: string,
  pubkey: string
): Promise<NostrEvent> {
  // Create unsigned deletion request
  const unsignedEvent = createDeletionRequest(
    { ids: [eventId], content: 'Link claimed' },
    pubkey
  );

  // Sign the event
  const id = await getEventHash(unsignedEvent);
  const sig = signEvent(id, privateKey);

  return {
    ...unsignedEvent,
    id,
    sig,
  };
}
```

### parseDeletionTargets

```typescript
import { parseDeletionTargets } from 'snstr';

const targets = parseDeletionTargets(deletionEvent);
// targets.ids - array of event IDs being deleted
// targets.addresses - array of NIP-33 addresses
// targets.kinds - array of event kinds
```

### isDeletionRequestForEvent

```typescript
import { isDeletionRequestForEvent } from 'snstr';

const isDeleted = isDeletionRequestForEvent(deletionEvent, targetEvent);
// Returns true if deletionEvent requests deletion of targetEvent
```

## Deletion Event Structure

```typescript
interface DeletionEvent {
  kind: 5;
  pubkey: string;          // Must match deleted event's pubkey
  content: string;         // Reason for deletion
  tags: [
    ['e', eventId],        // Event ID to delete
    // ... more 'e' tags for multiple events
  ];
  created_at: number;
  id: string;
  sig: string;
}
```

## Bitcoinlink Usage

```typescript
// In BitcoinLinkNostrClient.publishDeletion()
async publishDeletion(eventId: string, privateKey: string): Promise<void> {
  const { createDeletionRequest, getPublicKey, signEvent, getEventHash } = 
    await import('snstr');

  const pubkey = getPublicKey(privateKey);
  const unsignedEvent = createDeletionRequest(
    { ids: [eventId], content: 'Link claimed' },
    pubkey
  );

  const id = await getEventHash(unsignedEvent);
  const sig = signEvent(id, privateKey);

  const signedEvent = { ...unsignedEvent, id, sig };
  await this.client.publishEvent(signedEvent);
}

// Checking if link is claimed
async hasDeletionEvent(
  eventId: string,
  receiverPubkey: string
): Promise<boolean> {
  // Subscribe to kind 5 events from receiver with #e tag
  const filter = {
    kinds: [5],
    authors: [receiverPubkey],
    '#e': [eventId]
  };
  
  // If any deletion event exists, link is claimed
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5000);
    
    this.client.subscribe([filter], (event) => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
}
```

## Important Notes

1. **Author must match**: Deletion events must be signed by the same pubkey as the event being deleted
2. **Relays may ignore**: Relays are not required to honor deletion requests
3. **Soft delete**: This is a "request" - the original event may still exist on some relays
4. **Claim tracking**: In Bitcoinlink, we use deletion as a claim marker - if deletion exists, link was claimed

## Event Tags

| Tag | Description |
|-----|-------------|
| `e` | Event ID to delete |
| `a` | NIP-33 address to delete |
| `k` | Event kind to delete |

## Error Handling

```typescript
// Deletion only works if author matches
if (deletion.pubkey !== event.pubkey) {
  // Invalid - can't delete someone else's event
  return false;
}
```
