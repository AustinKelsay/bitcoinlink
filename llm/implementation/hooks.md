# Custom Hooks Documentation

## Overview

BitcoinLink uses two custom React hooks for toast notifications and Nostr event subscriptions.

---

## useToast

Toast notification context hook using PrimeReact's Toast component.

**Location:** `src/hooks/useToast.tsx`

### Implementation

```typescript
import React, { createContext, useContext, useRef } from 'react';
import { Toast } from 'primereact/toast';

const ToastContext = createContext<{ showToast: Function } | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const toast = useRef<Toast>(null);

  const showToast = (
    severity: 'success' | 'info' | 'warn' | 'error',
    summary: string,
    detail: string
  ) => {
    toast.current?.show({ severity, summary, detail });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Toast life={10000} ref={toast} />
      {children}
    </ToastContext.Provider>
  );
};
```

### Usage

**Provider Setup (_app.tsx):**
```tsx
import { ToastProvider } from '@/hooks/useToast';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}
```

**In Components:**
```tsx
import { useToast } from '@/hooks/useToast';

function MyComponent() {
  const { showToast } = useToast();

  const handleSuccess = () => {
    showToast('success', 'Success', 'Operation completed successfully');
  };

  const handleError = () => {
    showToast('error', 'Error', 'Something went wrong');
  };
}
```

### API

**showToast(severity, summary, detail)**

| Parameter | Type | Description |
|-----------|------|-------------|
| `severity` | `'success' \| 'info' \| 'warn' \| 'error'` | Toast type |
| `summary` | `string` | Toast title/header |
| `detail` | `string` | Toast body message |

### Configuration

- **Life:** 10000ms (10 seconds)
- **Position:** Default PrimeReact position (top-right)

---

## useSubscribeToEvents

Nostr event subscription hook for listening to wallet authorization events (used by Mutiny NWA flow).

**Location:** `src/hooks/useSubscribeToEvents.ts`

### Implementation

```typescript
import { useState, useRef } from 'react';
import { SimplePool } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';

const initialRelays = [
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://nostr.gleeze.com',
  'wss://relay.snort.social',
  'wss://relay.nostr.band',
  'wss://relay.xp.live',
  'wss://relay.wellorder.net',
  'wss://nostr-relay.ktwo.io',
  'wss://r.v0l.io',
  'wss://nostr.mutinywallet.com',
  'wss://bitcoiner.social',
  'wss://relay.primal.net',
];

const useSubscribeToEvents = () => {
  const [relays] = useState(initialRelays);
  const [fetchedEvents, setFetchedEvents] = useState<Event[]>([]);

  const pool = useRef(new SimplePool());
  const subscriptions = useRef<ReturnType<typeof pool.current.subscribeMany>[]>([]);

  const subscribeToEvents = (criteria: Filter[]) => {
    const sub = pool.current.subscribeMany(relays, criteria, {
      onevent(event: Event) {
        setFetchedEvents((prev) => [...prev, event]);
      },
    });

    subscriptions.current.push(sub);
    return sub;
  };

  return {
    subscribeToEvents,
    fetchedEvents,
  };
};

export default useSubscribeToEvents;
```

### Usage

```tsx
import useSubscribeToEvents from '@/hooks/useSubscribeToEvents';

function MutinyModal() {
  const { subscribeToEvents, fetchedEvents } = useSubscribeToEvents();

  useEffect(() => {
    // Subscribe to NWA response events (kind 33194)
    subscribeToEvents([{
      kinds: [33194],
      since: Math.round(Date.now() / 1000),
      '#d': [appPublicKey],
    }]);
  }, []);

  useEffect(() => {
    // Process fetched events
    fetchedEvents.forEach((event) => {
      // Handle NWA response event
    });
  }, [fetchedEvents]);
}
```

### API

**subscribeToEvents(criteria)**

| Parameter | Type | Description |
|-----------|------|-------------|
| `criteria` | `Filter[]` | Array of Nostr filter objects |

Returns: Subscription object

**fetchedEvents**

| Type | Description |
|------|-------------|
| `Event[]` | Array of received Nostr events |

### Filter Object Structure

```typescript
{
  kinds: [33194],           // Event kinds to subscribe to
  since: timestamp,         // Unix timestamp (seconds)
  '#d': [publicKey],        // Filter by d-tag value
}
```

### Relay List

The hook connects to 12 public Nostr relays for broad coverage of Mutiny NWA events.

### Used For

- **Mutiny Wallet Auth:** Subscribing to kind 33194 events for NWA responses
- **Real-time Updates:** Listening for wallet connection confirmations

---

## Note on Nostr Client

For the main link creation/claiming flows, BitcoinLink uses the custom `BitcoinLinkNostrClient` class in `src/lib/nostr/client.ts` instead of this hook. The hook is specifically for the Mutiny NWA authentication flow which uses `nostr-tools` directly.
