/**
 * Tests for gift wrap creation and decryption
 */

import { createBitcoinLink, decryptBitcoinLink, GIFT_WRAP_KIND } from '../../src/lib/nostr/gift-wrap';
import type { BitcoinLinkPayload } from '../../src/lib/nostr/types';

describe('Gift Wrap', () => {
  const testPayload: BitcoinLinkPayload = {
    type: 'bitcoinlink',
    nwcUrl: 'nostr+walletconnect://abc123?relay=wss://test.relay&secret=secret123',
    amount: 1000,
  };

  describe('createBitcoinLink', () => {
    it('should create a gift wrap event with correct kind', async () => {
      const result = await createBitcoinLink(testPayload);

      expect(result.giftWrap).toBeDefined();
      expect(result.giftWrap.kind).toBe(GIFT_WRAP_KIND);
      expect(result.giftWrap.id).toBeDefined();
      expect(result.giftWrap.sig).toBeDefined();
    });

    it('should generate ephemeral receiver keypair', async () => {
      const result = await createBitcoinLink(testPayload);

      expect(result.receiverPrivateKey).toBeDefined();
      expect(result.receiverPublicKey).toBeDefined();
      expect(result.receiverPrivateKey).toHaveLength(64);
      expect(result.receiverPublicKey).toHaveLength(64);
    });

    it('should create different keys for each call', async () => {
      const result1 = await createBitcoinLink(testPayload);
      const result2 = await createBitcoinLink(testPayload);

      expect(result1.receiverPrivateKey).not.toBe(result2.receiverPrivateKey);
      expect(result1.receiverPublicKey).not.toBe(result2.receiverPublicKey);
      expect(result1.giftWrap.id).not.toBe(result2.giftWrap.id);
    });

    it('should include receiver pubkey in p-tag', async () => {
      const result = await createBitcoinLink(testPayload);
      const pTag = result.giftWrap.tags.find(t => t[0] === 'p');

      expect(pTag).toBeDefined();
      expect(pTag![1]).toBe(result.receiverPublicKey);
    });
  });

  describe('decryptBitcoinLink', () => {
    it('should decrypt gift wrap to original payload', async () => {
      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(testPayload);

      const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);

      expect(decrypted.type).toBe('bitcoinlink');
      expect(decrypted.nwcUrl).toBe(testPayload.nwcUrl);
      expect(decrypted.amount).toBe(testPayload.amount);
    });

    it('should throw error for wrong kind with specific message', async () => {
      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(testPayload);
      const wrongKindEvent = { ...giftWrap, kind: 1 };

      expect(() => decryptBitcoinLink(wrongKindEvent, receiverPrivateKey))
        .toThrow(/Invalid event kind.*expected 1059.*got 1/);
    });

    it('should throw error for wrong private key', async () => {
      const { giftWrap } = await createBitcoinLink(testPayload);
      const wrongKey = 'a'.repeat(64);

      expect(() => decryptBitcoinLink(giftWrap, wrongKey)).toThrow();
    });

    it('should successfully decrypt valid payload type', async () => {
      // We can't easily test invalid payload type without mocking,
      // so we verify that valid payload type decrypts successfully
      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(testPayload);

      // Verify that a valid payload decrypts successfully
      const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);
      expect(decrypted.type).toBe('bitcoinlink');
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount payload', async () => {
      const zeroPayload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: 'nostr+walletconnect://test?relay=wss://r.com&secret=s',
        amount: 0,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(zeroPayload);
      const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);

      expect(decrypted.amount).toBe(0);
    });

    it('should handle very large amounts', async () => {
      const largePayload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: 'nostr+walletconnect://test?relay=wss://r.com&secret=s',
        amount: Number.MAX_SAFE_INTEGER,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(largePayload);
      const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);

      expect(decrypted.amount).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle NWC URL with unicode characters', async () => {
      const unicodePayload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: 'nostr+walletconnect://test?relay=wss://relay.com&secret=secret🔐',
        amount: 100,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(unicodePayload);
      const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);

      expect(decrypted.nwcUrl).toBe(unicodePayload.nwcUrl);
    });

    it('should generate unique event IDs for concurrent creations', async () => {
      const promises = Array(10).fill(null).map(() => createBitcoinLink(testPayload));
      const results = await Promise.all(promises);

      const eventIds = results.map(r => r.giftWrap.id);
      const uniqueIds = new Set(eventIds);

      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('roundtrip', () => {
    it('should preserve all payload fields through create/decrypt', async () => {
      const payloads: BitcoinLinkPayload[] = [
        { type: 'bitcoinlink', nwcUrl: 'nostr+walletconnect://test', amount: 1 },
        { type: 'bitcoinlink', nwcUrl: 'nostr+walletconnect://abc?relay=wss://r1&relay=wss://r2&secret=xyz', amount: 999999 },
        { type: 'bitcoinlink', nwcUrl: 'nostr+walletconnect://00000?relay=wss://relay.example.com&secret=12345', amount: 21000000 },
      ];

      for (const payload of payloads) {
        const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
        const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);

        expect(decrypted).toEqual(payload);
      }
    });
  });

  describe('key validation', () => {
    it('should throw for truncated private key', async () => {
      const { giftWrap } = await createBitcoinLink(testPayload);
      
      const truncatedKeys = ['a', 'a'.repeat(32), 'a'.repeat(63)];
      for (const key of truncatedKeys) {
        expect(() => decryptBitcoinLink(giftWrap, key)).toThrow();
      }
    });

    it('should throw for empty private key', async () => {
      const { giftWrap } = await createBitcoinLink(testPayload);
      expect(() => decryptBitcoinLink(giftWrap, '')).toThrow();
    });

    it('should throw for non-hex private key', async () => {
      const { giftWrap } = await createBitcoinLink(testPayload);
      const invalidKey = 'z'.repeat(64);
      expect(() => decryptBitcoinLink(giftWrap, invalidKey)).toThrow();
    });
  });

  describe('event structure', () => {
    it('should create valid Nostr event structure', async () => {
      const result = await createBitcoinLink(testPayload);
      const event = result.giftWrap;

      expect(event.id).toHaveLength(64);
      expect(event.pubkey).toHaveLength(64);
      expect(typeof event.created_at).toBe('number');
      expect(event.created_at).toBeGreaterThan(0);
      expect(event.kind).toBe(GIFT_WRAP_KIND);
      expect(Array.isArray(event.tags)).toBe(true);
      expect(typeof event.content).toBe('string');
      expect(event.sig).toHaveLength(128);
    });

    it('should not contain plaintext payload in content', async () => {
      const result = await createBitcoinLink(testPayload);
      
      expect(result.giftWrap.content).not.toContain(testPayload.nwcUrl);
      expect(result.giftWrap.content).not.toContain('bitcoinlink');
    });
  });

  describe('batch operations', () => {
    it('should handle 50 concurrent creations', async () => {
      const batchSize = 50;
      const promises = Array(batchSize).fill(null).map(() => createBitcoinLink(testPayload));
      const results = await Promise.all(promises);

      expect(results.length).toBe(batchSize);
      
      const eventIds = new Set(results.map(r => r.giftWrap.id));
      const privateKeys = new Set(results.map(r => r.receiverPrivateKey));
      expect(eventIds.size).toBe(batchSize);
      expect(privateKeys.size).toBe(batchSize);
    });
  });

  describe('payload edge cases', () => {
    it('should handle NWC URL with all special characters', async () => {
      const specialPayload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: 'nostr+walletconnect://test?relay=wss://r.com&secret=!@#$%^&*()_+-=[]{}|;:,.<>?',
        amount: 100,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(specialPayload);
      const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);

      expect(decrypted.nwcUrl).toBe(specialPayload.nwcUrl);
    });

    it('should handle very long NWC URL', async () => {
      const longNwcUrl = 'nostr+walletconnect://test?' + 'relay=wss://r.com&'.repeat(100) + 'secret=abc';
      const longPayload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: longNwcUrl,
        amount: 100,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(longPayload);
      const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);

      expect(decrypted.nwcUrl).toBe(longNwcUrl);
    });

    it('should handle floating point amounts', async () => {
      const precisionPayload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: 'nostr+walletconnect://test?relay=wss://r.com&secret=s',
        amount: 0.1 + 0.2,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(precisionPayload);
      const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);

      expect(decrypted.amount).toBe(0.1 + 0.2);
    });
  });
});
