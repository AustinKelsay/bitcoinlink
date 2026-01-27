/**
 * Tests for BitcoinLinkNostrClient
 * Unit tests for the Nostr relay client wrapper
 */

import { BitcoinLinkNostrClient } from '../../src/lib/nostr/client';
import { DEFAULT_RELAYS } from '../../src/lib/nostr/relays';

// Note: These tests focus on client configuration and state management.
// Integration tests requiring real relay connections are marked as such.

describe('BitcoinLinkNostrClient', () => {
  describe('constructor', () => {
    it('should use default relays when none provided', () => {
      const client = new BitcoinLinkNostrClient();
      expect(client.getRelays()).toEqual(DEFAULT_RELAYS);
    });

    it('should use custom relays when provided', () => {
      const customRelays = ['wss://custom1.relay', 'wss://custom2.relay'];
      const client = new BitcoinLinkNostrClient(customRelays);
      expect(client.getRelays()).toEqual(customRelays);
    });

    it('should accept empty relay array', () => {
      const client = new BitcoinLinkNostrClient([]);
      expect(client.getRelays()).toEqual([]);
    });

    it('should accept single relay', () => {
      const client = new BitcoinLinkNostrClient(['wss://single.relay']);
      expect(client.getRelays()).toEqual(['wss://single.relay']);
    });
  });

  describe('getRelays', () => {
    it('should return a copy of relays array', () => {
      const originalRelays = ['wss://relay1.com', 'wss://relay2.com'];
      const client = new BitcoinLinkNostrClient(originalRelays);

      const returnedRelays = client.getRelays();
      returnedRelays.push('wss://injected.relay');

      // Original should not be modified
      expect(client.getRelays()).toEqual(originalRelays);
      expect(client.getRelays().length).toBe(2);
    });

    it('should return empty array for client with no relays', () => {
      const client = new BitcoinLinkNostrClient([]);
      expect(client.getRelays()).toEqual([]);
      expect(client.getRelays().length).toBe(0);
    });
  });

  describe('close', () => {
    it('should not throw when called on new client', () => {
      const client = new BitcoinLinkNostrClient();
      expect(() => client.close()).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      const client = new BitcoinLinkNostrClient();
      expect(() => {
        client.close();
        client.close();
        client.close();
      }).not.toThrow();
    });
  });

  describe('relay configuration', () => {
    it('should preserve relay order', () => {
      const orderedRelays = [
        'wss://first.relay',
        'wss://second.relay',
        'wss://third.relay',
      ];
      const client = new BitcoinLinkNostrClient(orderedRelays);

      const result = client.getRelays();
      expect(result[0]).toBe('wss://first.relay');
      expect(result[1]).toBe('wss://second.relay');
      expect(result[2]).toBe('wss://third.relay');
    });

    it('should handle relays with different protocols', () => {
      // Note: wss:// is expected, but client should accept any string
      const mixedRelays = [
        'wss://secure.relay',
        'ws://insecure.relay',
      ];
      const client = new BitcoinLinkNostrClient(mixedRelays);
      expect(client.getRelays()).toEqual(mixedRelays);
    });

    it('should handle duplicate relays (no deduplication)', () => {
      const duplicateRelays = [
        'wss://relay.com',
        'wss://relay.com',
        'wss://relay.com',
      ];
      const client = new BitcoinLinkNostrClient(duplicateRelays);
      expect(client.getRelays()).toHaveLength(3);
    });
  });

  // Integration tests - these would require mocking snstr or real relay connections
  describe('integration (requires relay connection)', () => {
    // These tests document expected behavior but are skipped in unit testing
    // They can be enabled for integration testing with real relays

    it.skip('connect() should establish relay connections', async () => {
      const client = new BitcoinLinkNostrClient(['wss://relay.damus.io']);
      await expect(client.connect()).resolves.not.toThrow();
      client.close();
    });

    it.skip('connect() should be idempotent', async () => {
      const client = new BitcoinLinkNostrClient(['wss://relay.damus.io']);
      await client.connect();
      await expect(client.connect()).resolves.not.toThrow();
      client.close();
    });

    it.skip('fetchEvent() should return null for non-existent event', async () => {
      const client = new BitcoinLinkNostrClient(['wss://relay.damus.io']);
      await client.connect();

      const fakeEventId = '0'.repeat(64);
      const result = await client.fetchEvent(fakeEventId, 2000);

      expect(result).toBeNull();
      client.close();
    });
  });
});
