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
});
