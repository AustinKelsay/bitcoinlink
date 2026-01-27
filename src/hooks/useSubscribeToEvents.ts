import { useState, useRef, useEffect } from 'react';
import { SimplePool, type Event, type Filter, type Sub } from 'nostr-tools';

const initialRelays: string[] = [
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

interface UseSubscribeToEventsReturn {
  subscribeToEvents: (criteria: Filter[]) => Sub;
  fetchedEvents: Event[];
}

const useSubscribeToEvents = (): UseSubscribeToEventsReturn => {
  const [relays] = useState<string[]>(initialRelays);
  const [fetchedEvents, setFetchedEvents] = useState<Event[]>([]);

  const pool = useRef<SimplePool>(
    new SimplePool({ seenOnEnabled: true })
  );
  const subscriptions = useRef<Sub[]>([]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    const currentPool = pool.current;
    const currentSubscriptions = subscriptions.current;
    return () => {
      currentSubscriptions.forEach((sub) => {
        sub.unsub();
      });
      currentPool.close(relays);
    };
  }, [relays]);

  const subscribeToEvents = (criteria: Filter[]): Sub => {
    const sub = pool.current.sub(relays, criteria, {
      alreadyHaveEvent: (id: string) => {
        // Check if the event id has been seen before using SimplePool's seenOn method
        if (pool.current.seenOn(id).length > 0) {
          return true;
        }
        return false;
      },
    });

    sub.on('event', (event: Event) => {
      setFetchedEvents((prev) => [...prev, event]);
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
