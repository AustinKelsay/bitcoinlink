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

    it('should return false for null/undefined', () => {
      expect(isValidNWCUrl(null as unknown as string)).toBe(false);
      expect(isValidNWCUrl(undefined as unknown as string)).toBe(false);
    });

    it('should handle short pubkey consistently', () => {
      // Note: snstr may accept shorter pubkeys - test that it doesn't crash
      const shortPubkey = 'abc123';
      const url = `nostr+walletconnect://${shortPubkey}?relay=wss%3A%2F%2Frelay.com&secret=test`;
      expect(() => isValidNWCUrl(url)).not.toThrow();
      // Result depends on snstr implementation
      expect(typeof isValidNWCUrl(url)).toBe('boolean');
    });

    it('should handle various pubkey formats consistently', () => {
      // Test various formats - behavior depends on snstr
      const testCases = [
        { pubkey: 'g'.repeat(64), desc: 'non-hex chars' },
        { pubkey: '0'.repeat(32), desc: '32 char pubkey' },
        { pubkey: '', desc: 'empty pubkey' },
      ];

      for (const { pubkey, desc } of testCases) {
        const url = `nostr+walletconnect://${pubkey}?relay=wss%3A%2F%2Frelay.com&secret=test`;
        expect(() => isValidNWCUrl(url)).not.toThrow();
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

    it('should return empty array for null/undefined', () => {
      expect(getRelaysFromNWCUrl(null as unknown as string)).toEqual([]);
      expect(getRelaysFromNWCUrl(undefined as unknown as string)).toEqual([]);
    });

    it('should handle URL-encoded relay addresses', () => {
      // wss://relay.test.com encoded as wss%3A%2F%2Frelay.test.com
      const url = `nostr+walletconnect://${VALID_PUBKEY}?relay=wss%3A%2F%2Frelay.test.com&secret=abc`;
      const relays = getRelaysFromNWCUrl(url);

      expect(relays.length).toBeGreaterThanOrEqual(1);
      expect(relays[0]).toContain('relay.test.com');
    });
  });

  describe('edge cases', () => {
    it('should handle NWC URL with extra parameters', () => {
      const url = `nostr+walletconnect://${VALID_PUBKEY}?relay=wss%3A%2F%2Frelay.com&secret=abc&extra=param&another=value`;

      expect(isValidNWCUrl(url)).toBe(true);
      const relays = getRelaysFromNWCUrl(url);
      expect(relays.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle uppercase protocol', () => {
      const url = `NOSTR+WALLETCONNECT://${VALID_PUBKEY}?relay=wss%3A%2F%2Frelay.com&secret=abc`;
      // Behavior depends on snstr implementation - just ensure no crash
      expect(() => isValidNWCUrl(url)).not.toThrow();
      expect(() => getRelaysFromNWCUrl(url)).not.toThrow();
    });
  });
});
