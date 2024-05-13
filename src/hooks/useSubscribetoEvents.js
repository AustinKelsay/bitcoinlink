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
    const [fetchedEvents, setFetchedEvents] = useState([])

    const pool = useRef(new SimplePool({ seenOnEnabled: true }));
    const subscriptions = useRef([]);

    const subscribeToEvents = (criteria) => {
        const sub = pool.current.sub(relays, criteria, {
            alreadyHaveEvent: (id, relay) => {
                // Check if the event id has been seen before using SimplePool's seenOn method
                if (pool.current.seenOn(id).length > 0) {
                    return true;
                }
                return false;
            }
        });

        sub.on("event", (event) => {
            setFetchedEvents([...fetchedEvents, event])
        });

        subscriptions.current.push(sub); // store the subscription
        return sub;
    };

    return {
        subscribeToEvents,
        fetchedEvents
    };
};

export default useSubscribetoEvents;