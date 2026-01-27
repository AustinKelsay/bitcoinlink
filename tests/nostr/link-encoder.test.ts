/**
 * Tests for link URL encoding and decoding
 */

import {
  encodeLink,
  decodeLink,
  createClaimUrl,
  createClaimPath,
} from '../../src/lib/nostr/link-encoder';
import { DEFAULT_RELAYS } from '../../src/lib/nostr/relays';
import type { EncodedLink } from '../../src/lib/nostr/types';

describe('Link Encoder', () => {
  const testLink: EncodedLink = {
    eventId: 'abc123def456',
    receiverPrivateKey: 'a'.repeat(64),
    relays: ['wss://relay1.example.com', 'wss://relay2.example.com'],
    amountSats: 1000,
  };

  describe('encodeLink', () => {
    it('should encode link to base64url string', () => {
      const encoded = encodeLink(testLink);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      // Base64url should not contain +, /, or =
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('should produce different output for different inputs', () => {
      const link2: EncodedLink = { ...testLink, amountSats: 2000 };

      const encoded1 = encodeLink(testLink);
      const encoded2 = encodeLink(link2);

      expect(encoded1).not.toBe(encoded2);
    });
  });

  describe('decodeLink', () => {
    it('should decode back to original link data', () => {
      const encoded = encodeLink(testLink);
      const decoded = decodeLink(encoded);

      expect(decoded).toEqual(testLink);
    });

    it('should handle links with many relays', () => {
      const linkWithManyRelays: EncodedLink = {
        ...testLink,
        relays: [
          'wss://relay1.com',
          'wss://relay2.com',
          'wss://relay3.com',
          'wss://relay4.com',
          'wss://relay5.com',
        ],
      };

      const encoded = encodeLink(linkWithManyRelays);
      const decoded = decodeLink(encoded);

      expect(decoded).toEqual(linkWithManyRelays);
    });

    it('should handle large amounts', () => {
      const linkWithLargeAmount: EncodedLink = {
        ...testLink,
        amountSats: 21000000 * 100000000, // 21 million BTC in sats
      };

      const encoded = encodeLink(linkWithLargeAmount);
      const decoded = decodeLink(encoded);

      expect(decoded.amountSats).toBe(linkWithLargeAmount.amountSats);
    });

    it('should throw for invalid input', () => {
      expect(() => decodeLink('not-valid-base64!')).toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => decodeLink('')).toThrow();
    });

    it('should throw for malformed JSON in valid base64', () => {
      // "not json" in base64
      const notJson = Buffer.from('not json').toString('base64').replace(/=/g, '');
      expect(() => decodeLink(notJson)).toThrow();
    });

    it('should handle zero amount', () => {
      const linkWithZeroAmount: EncodedLink = {
        ...testLink,
        amountSats: 0,
      };

      const encoded = encodeLink(linkWithZeroAmount);
      const decoded = decodeLink(encoded);

      expect(decoded.amountSats).toBe(0);
    });
  });

  describe('createClaimUrl', () => {
    it('should create full URL with bitcoinlink.app domain', () => {
      const url = createClaimUrl(
        testLink.eventId,
        testLink.receiverPrivateKey,
        testLink.amountSats,
        testLink.relays
      );

      expect(url).toMatch(/^https:\/\/bitcoinlink\.app\/claim\//);
    });

    it('should use default relays when not specified', () => {
      const url = createClaimUrl(
        testLink.eventId,
        testLink.receiverPrivateKey,
        testLink.amountSats
      );

      // Decode the URL to check relays
      const encoded = url.split('/claim/')[1];
      const decoded = decodeLink(encoded);

      expect(decoded.relays).toEqual(DEFAULT_RELAYS);
    });

    it('should create decodeable URL', () => {
      const url = createClaimUrl(
        testLink.eventId,
        testLink.receiverPrivateKey,
        testLink.amountSats,
        testLink.relays
      );

      const encoded = url.split('/claim/')[1];
      const decoded = decodeLink(encoded);

      expect(decoded.eventId).toBe(testLink.eventId);
      expect(decoded.receiverPrivateKey).toBe(testLink.receiverPrivateKey);
      expect(decoded.amountSats).toBe(testLink.amountSats);
      expect(decoded.relays).toEqual(testLink.relays);
    });
  });

  describe('createClaimPath', () => {
    it('should create path without domain', () => {
      const path = createClaimPath(
        testLink.eventId,
        testLink.receiverPrivateKey,
        testLink.amountSats,
        testLink.relays
      );

      expect(path).toMatch(/^\/claim\//);
      expect(path).not.toContain('https://');
    });

    it('should be decodeable', () => {
      const path = createClaimPath(
        testLink.eventId,
        testLink.receiverPrivateKey,
        testLink.amountSats,
        testLink.relays
      );

      const encoded = path.split('/claim/')[1];
      const decoded = decodeLink(encoded);

      expect(decoded.eventId).toBe(testLink.eventId);
    });
  });

  describe('edge cases', () => {
    it('should handle empty relays array', () => {
      const linkWithNoRelays: EncodedLink = {
        ...testLink,
        relays: [],
      };

      const encoded = encodeLink(linkWithNoRelays);
      const decoded = decodeLink(encoded);

      expect(decoded.relays).toEqual([]);
    });

    it('should handle very long event IDs', () => {
      const linkWithLongId: EncodedLink = {
        ...testLink,
        eventId: 'f'.repeat(256),
      };

      const encoded = encodeLink(linkWithLongId);
      const decoded = decodeLink(encoded);

      expect(decoded.eventId).toBe(linkWithLongId.eventId);
    });

    it('should handle relay URLs with special characters', () => {
      const linkWithSpecialRelays: EncodedLink = {
        ...testLink,
        relays: ['wss://relay.example.com/path?query=value&other=123'],
      };

      const encoded = encodeLink(linkWithSpecialRelays);
      const decoded = decodeLink(encoded);

      expect(decoded.relays).toEqual(linkWithSpecialRelays.relays);
    });
  });

  describe('roundtrip', () => {
    it('should preserve all data through encode/decode cycle', () => {
      const links: EncodedLink[] = [
        {
          eventId: '0'.repeat(64),
          receiverPrivateKey: '1'.repeat(64),
          relays: ['wss://r.com'],
          amountSats: 1,
        },
        {
          eventId: 'f'.repeat(64),
          receiverPrivateKey: 'e'.repeat(64),
          relays: DEFAULT_RELAYS,
          amountSats: 100000000,
        },
        {
          eventId: 'abcd1234'.repeat(8),
          receiverPrivateKey: '5678efgh'.repeat(8),
          relays: [
            'wss://relay.damus.io',
            'wss://relay.nostr.band',
            'wss://nos.lol',
          ],
          amountSats: 21,
        },
      ];

      for (const link of links) {
        const encoded = encodeLink(link);
        const decoded = decodeLink(encoded);
        expect(decoded).toEqual(link);
      }
    });
  });

  describe('malformed input', () => {
    it('should throw for truncated base64 data', () => {
      const validLink = encodeLink(testLink);
      const truncated = validLink.substring(0, validLink.length / 2);
      expect(() => decodeLink(truncated)).toThrow();
    });

    it('should throw for corrupted data', () => {
      const validLink = encodeLink(testLink);
      const corrupted = validLink.substring(0, 10) + '!!!' + validLink.substring(13);
      expect(() => decodeLink(corrupted)).toThrow();
    });

    it('should throw for whitespace-only input', () => {
      expect(() => decodeLink('   ')).toThrow();
      expect(() => decodeLink('\n\t')).toThrow();
    });
  });

  describe('URL safety', () => {
    it('should produce URL-safe output without +/= characters', () => {
      for (let i = 0; i < 20; i++) {
        const link: EncodedLink = {
          eventId: Math.random().toString(36).repeat(10).substring(0, 64),
          receiverPrivateKey: Math.random().toString(36).repeat(10).substring(0, 64),
          relays: ['wss://relay.com/' + Math.random().toString(36)],
          amountSats: Math.floor(Math.random() * 1000000),
        };

        const encoded = encodeLink(link);
        expect(encoded).not.toMatch(/[+/=]/);
        expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
      }
    });

    it('should work embedded in actual URLs', () => {
      const encoded = encodeLink(testLink);
      
      const url = new URL(`https://bitcoinlink.app/claim/${encoded}`);
      expect(url.pathname).toContain(encoded);
      
      const queryUrl = new URL(`https://example.com?link=${encoded}`);
      expect(queryUrl.searchParams.get('link')).toBe(encoded);
    });
  });

  describe('determinism', () => {
    it('should produce consistent output for same input', () => {
      const encoded1 = encodeLink(testLink);
      const encoded2 = encodeLink(testLink);
      const encoded3 = encodeLink({ ...testLink });

      expect(encoded1).toBe(encoded2);
      expect(encoded1).toBe(encoded3);
    });
  });

  describe('claim URL edge cases', () => {
    it('should handle 50 relays', () => {
      const manyRelays = Array(50).fill(null).map((_, i) => `wss://relay${i}.example.com`);
      const url = createClaimUrl(
        testLink.eventId,
        testLink.receiverPrivateKey,
        testLink.amountSats,
        manyRelays
      );

      expect(url).toMatch(/^https:\/\/bitcoinlink\.app\/claim\//);
      
      const encoded = url.split('/claim/')[1];
      const decoded = decodeLink(encoded);
      expect(decoded.relays).toEqual(manyRelays);
    });

    it('should handle minimum valid input', () => {
      const url = createClaimUrl('a', 'b', 0, []);

      expect(url).toContain('https://bitcoinlink.app/claim/');
      
      const encoded = url.split('/claim/')[1];
      const decoded = decodeLink(encoded);
      expect(decoded.eventId).toBe('a');
      expect(decoded.amountSats).toBe(0);
      expect(decoded.relays).toEqual([]);
    });
  });
});
