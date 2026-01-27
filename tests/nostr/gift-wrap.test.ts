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

    it('should throw error for wrong kind', async () => {
      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(testPayload);
      const wrongKindEvent = { ...giftWrap, kind: 1 };

      expect(() => decryptBitcoinLink(wrongKindEvent, receiverPrivateKey))
        .toThrow('Invalid event kind');
    });

    it('should throw error for wrong private key', async () => {
      const { giftWrap } = await createBitcoinLink(testPayload);
      const wrongKey = 'a'.repeat(64);

      expect(() => decryptBitcoinLink(giftWrap, wrongKey)).toThrow();
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
});
