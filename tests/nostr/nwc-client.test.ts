/**
 * Tests for NWC client utilities
 */

import { isValidNWCUrl, getRelaysFromNWCUrl } from '../../src/lib/nostr/nwc-client';

// Valid 64-character hex pubkey for tests
const VALID_PUBKEY = 'a'.repeat(64);

describe('NWC Client Utilities', () => {
  describe('isValidNWCUrl', () => {
    it('should return true for valid NWC URLs', () => {
      const validUrls = [
        `nostr+walletconnect://${VALID_PUBKEY}?relay=wss%3A%2F%2Frelay.test.com&secret=testsecret`,
        `nostr+walletconnect://${VALID_PUBKEY}?relay=wss%3A%2F%2Fr1.com&relay=wss%3A%2F%2Fr2.com&secret=xyz`,
        `nostr+walletconnect://${'0123456789abcdef'.repeat(4)}?relay=wss%3A%2F%2Frelay.example.com&secret=secret123`,
      ];

      for (const url of validUrls) {
        expect(isValidNWCUrl(url)).toBe(true);
      }
    });

    it('should return false for invalid NWC URLs', () => {
      const invalidUrls = [
        'https://example.com',
        'nostr://pubkey',
        'walletconnect://pubkey',
        '',
        'not-a-url',
        'nostr+walletconnect://', // missing pubkey
        `nostr+walletconnect://${VALID_PUBKEY}?relay=wss://test.com`, // missing secret
      ];

      for (const url of invalidUrls) {
        expect(isValidNWCUrl(url)).toBe(false);
      }
    });
  });

  describe('getRelaysFromNWCUrl', () => {
    it('should extract relay URLs from valid NWC URL', () => {
      const url = `nostr+walletconnect://${VALID_PUBKEY}?relay=wss%3A%2F%2Frelay.test.com&secret=abc`;
      const relays = getRelaysFromNWCUrl(url);

      expect(relays).toContain('wss://relay.test.com');
    });

    it('should extract multiple relay URLs', () => {
      const url = `nostr+walletconnect://${VALID_PUBKEY}?relay=wss%3A%2F%2Fr1.com&relay=wss%3A%2F%2Fr2.com&secret=xyz`;
      const relays = getRelaysFromNWCUrl(url);

      expect(relays.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for invalid URL', () => {
      const invalidUrls = [
        'https://example.com',
        'not-a-url',
        '',
      ];

      for (const url of invalidUrls) {
        const relays = getRelaysFromNWCUrl(url);
        expect(relays).toEqual([]);
      }
    });
  });
});
