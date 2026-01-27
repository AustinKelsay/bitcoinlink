/**
 * Nostr relay client wrapper for Bitcoin Links
 */

import { Nostr, GIFT_WRAP_KIND } from 'snstr';
import type { NostrEvent } from 'snstr';
import { DEFAULT_RELAYS } from './relays';

/**
 * Bitcoin Link Nostr client for publishing and fetching gift wrap events.
 */
export class BitcoinLinkNostrClient {
  private client: Nostr;
  private relays: string[];
  private connected: boolean = false;

  constructor(relays: string[] = DEFAULT_RELAYS) {
    this.relays = relays;
    this.client = new Nostr(this.relays);
  }

  /**
   * Connect to all configured relays.
   */
  async connect(): Promise<void> {
    if (this.connected) return;
    await this.client.connectToRelays();
    this.connected = true;
  }

  /**
   * Publish a gift wrap event to all relays.
   *
   * @param event - The gift wrap event to publish
   * @throws If publishing fails on all relays
   */
  async publish(event: NostrEvent): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
    await this.client.publishEvent(event);
  }

  /**
   * Fetch a gift wrap event by ID.
   *
   * @param eventId - The event ID to fetch
   * @param timeoutMs - Timeout in milliseconds (default: 10000)
   * @returns The event if found, or null
   */
  async fetchEvent(eventId: string, timeoutMs: number = 10000): Promise<NostrEvent | null> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve) => {
      let foundEvent: NostrEvent | null = null;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.client.unsubscribe(subIds);
          resolve(foundEvent);
        }
      }, timeoutMs);

      const subIds = this.client.subscribe(
        [{ ids: [eventId], kinds: [GIFT_WRAP_KIND] }],
        (event: NostrEvent) => {
          if (event.id === eventId && !resolved) {
            foundEvent = event;
            resolved = true;
            clearTimeout(timeout);
            this.client.unsubscribe(subIds);
            resolve(event);
          }
        }
      );
    });
  }

  /**
   * Check if a deletion event exists for a given event ID.
   * Used to determine if a link has been claimed.
   *
   * @param eventId - The event ID to check for deletion
   * @param receiverPubkey - The receiver's public key (author of the deletion event)
   * @param timeoutMs - Timeout in milliseconds (default: 5000)
   * @returns True if a deletion event exists
   */
  async hasDeletionEvent(
    eventId: string,
    receiverPubkey: string,
    timeoutMs: number = 5000
  ): Promise<boolean> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve) => {
      let found = false;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.client.unsubscribe(subIds);
          resolve(found);
        }
      }, timeoutMs);

      const subIds = this.client.subscribe(
        [{ kinds: [5], authors: [receiverPubkey], '#e': [eventId] }],
        () => {
          if (!resolved) {
            found = true;
            resolved = true;
            clearTimeout(timeout);
            this.client.unsubscribe(subIds);
            resolve(true);
          }
        }
      );
    });
  }

  /**
   * Publish a deletion event for a claimed link.
   *
   * @param eventId - The event ID to delete
   * @param privateKey - Private key to sign the deletion event
   */
  async publishDeletion(eventId: string, privateKey: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    // Import dynamically to avoid issues with SSR
    const { createDeletionRequest, getPublicKey, signEvent, getEventHash } = await import('snstr');

    const pubkey = getPublicKey(privateKey);
    const unsignedEvent = createDeletionRequest(
      { ids: [eventId], content: 'Link claimed' },
      pubkey
    );

    const id = await getEventHash(unsignedEvent);
    const sig = await signEvent(id, privateKey);

    const signedEvent: NostrEvent = {
      ...unsignedEvent,
      id,
      sig,
    };

    await this.client.publishEvent(signedEvent);
  }

  /**
   * Disconnect from all relays.
   */
  close(): void {
    if (this.connected) {
      this.client.disconnectFromRelays();
      this.connected = false;
    }
  }

  /**
   * Get the list of configured relays.
   */
  getRelays(): string[] {
    return [...this.relays];
  }
}
