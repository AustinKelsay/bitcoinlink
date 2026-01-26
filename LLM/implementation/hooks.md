# Custom Hooks Documentation

## Overview

BitcoinLink uses two custom React hooks for toast notifications and Nostr event subscriptions.

## useToast

Toast notification context hook using PrimeReact's Toast component.

**Location:** `src/hooks/useToast.js`

### Implementation

```javascript
import React, { createContext, useContext, useRef } from 'react';
import { Toast } from 'primereact/toast';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const toast = useRef(null);

  const showToast = (severity, summary, detail) => {
    toast.current.show({ severity, summary, detail });
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

**Provider Setup (\_app.js):**
```jsx
import { ToastProvider } from '@/hooks/useToast';

function MyApp({ Component, pageProps }) {
  return (
    <ToastProvider>
      <Component {...pageProps} />
    </ToastProvider>
  );
}
```

**In Components:**
```jsx
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
| `severity` | string | Toast type: `'success'`, `'info'`, `'warn'`, `'error'` |
| `summary` | string | Toast title/header |
| `detail` | string | Toast body message |

### Configuration

- **Life:** 10000ms (10 seconds)
- **Position:** Default PrimeReact position (top-right)

---

## useSubscribetoEvents

Nostr event subscription hook for listening to wallet authorization events.

**Location:** `src/hooks/useSubscribetoEvents.js`

### Implementation

```javascript
import { useState, useRef } from "react";
import { SimplePool } from "nostr-tools";

const initialRelays = [
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://nostr.gleeze.com",
  "wss://relay.snort.social",
  "wss://relay.nostr.band",
  "wss://relay.xp.live",
  "wss://relay.wellorder.net",
  "wss://nostr-relay.ktwo.io",
  "wss://r.v0l.io",
  "wss://nostr.mutinywallet.com",
  "wss://bitcoiner.social",
  "wss://relay.primal.net"
];

const useSubscribetoEvents = () => {
  const [relays, setRelays] = useState(initialRelays);
  const [fetchedEvents, setFetchedEvents] = useState([]);

  const pool = useRef(new SimplePool({ seenOnEnabled: true }));
  const subscriptions = useRef([]);

  const subscribeToEvents = (criteria) => {
    const sub = pool.current.sub(relays, criteria, {
      alreadyHaveEvent: (id, relay) => {
        if (pool.current.seenOn(id).length > 0) {
          return true;
        }
        return false;
      }
    });

    sub.on("event", (event) => {
      setFetchedEvents([...fetchedEvents, event]);
    });

    subscriptions.current.push(sub);
    return sub;
  };

  return {
    subscribeToEvents,
    fetchedEvents
  };
};

export default useSubscribetoEvents;
```

### Usage

```jsx
import useSubscribetoEvents from "@/hooks/useSubscribetoEvents";

function MyComponent() {
  const { subscribeToEvents, fetchedEvents } = useSubscribetoEvents();

  useEffect(() => {
    // Subscribe to NWA response events (kind 33194)
    subscribeToEvents([{
      kinds: [33194],
      since: Math.round(Date.now() / 1000),
      "#d": [appPublicKey]
    }]);
  }, []);

  useEffect(() => {
    // Process fetched events
    fetchedEvents.forEach(event => {
      // Handle event
    });
  }, [fetchedEvents]);
}
```

### API

**subscribeToEvents(criteria)**

| Parameter | Type | Description |
|-----------|------|-------------|
| `criteria` | object[] | Array of Nostr filter objects |

Returns: Subscription object

**fetchedEvents**

| Type | Description |
|------|-------------|
| object[] | Array of received Nostr events |

### Filter Object Structure

```javascript
{
  kinds: [33194],           // Event kinds to subscribe to
  since: timestamp,         // Unix timestamp (seconds)
  "#d": [publicKey]         // Filter by d-tag value
}
```

### Relay List

The hook connects to 12 public Nostr relays:
- `wss://nos.lol`
- `wss://relay.damus.io`
- `wss://nostr.gleeze.com`
- `wss://relay.snort.social`
- `wss://relay.nostr.band`
- `wss://relay.xp.live`
- `wss://relay.wellorder.net`
- `wss://nostr-relay.ktwo.io`
- `wss://r.v0l.io`
- `wss://nostr.mutinywallet.com`
- `wss://bitcoiner.social`
- `wss://relay.primal.net`

### Event Deduplication

Uses nostr-tools `SimplePool` with `seenOnEnabled: true` to prevent duplicate event processing. The `alreadyHaveEvent` callback checks if an event has been seen on any relay before adding it.

### Used For

- **Mutiny Wallet Auth:** Subscribing to kind 33194 events for NWA responses
- **Real-time Updates:** Listening for wallet connection confirmations
