/**
 * Integration tests for the full claim flow
 * Tests the create -> encode -> decode -> decrypt cycle
 */

import {
  createBitcoinLink,
  decryptBitcoinLink,
  encodeLink,
  decodeLink,
  createClaimUrl,
} from '../../src/lib/nostr';
import type { BitcoinLinkPayload, EncodedLink } from '../../src/lib/nostr';

describe('Claim Flow Integration', () => {
  const testNwcUrl = 'nostr+walletconnect://testpubkey123?relay=wss://relay.test.com&secret=testsecret';
  const testAmount = 1000;

  describe('full claim flow', () => {
    it('should complete the full create -> claim flow', async () => {
      // Step 1: Creator creates a bitcoin link
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: testNwcUrl,
        amount: testAmount,
      };

      const { giftWrap, receiverPrivateKey, receiverPublicKey } = await createBitcoinLink(payload);

      // Verify gift wrap was created
      expect(giftWrap.id).toBeDefined();
      expect(giftWrap.kind).toBe(1059);

      // Step 2: Creator generates the claim URL
      const relays = ['wss://relay.test.com', 'wss://relay2.test.com'];
      const claimUrl = createClaimUrl(
        giftWrap.id,
        receiverPrivateKey,
        testAmount,
        relays
      );

      expect(claimUrl).toContain('https://bitcoinlink.app/claim/');

      // Step 3: Claimer receives URL and decodes it
      const encodedPart = claimUrl.split('/claim/')[1];
      const linkData: EncodedLink = decodeLink(encodedPart);

      expect(linkData.eventId).toBe(giftWrap.id);
      expect(linkData.receiverPrivateKey).toBe(receiverPrivateKey);
      expect(linkData.amountSats).toBe(testAmount);
      expect(linkData.relays).toEqual(relays);

      // Step 4: Claimer decrypts the gift wrap to get NWC URL
      // (In real scenario, claimer fetches event from relays first)
      const decryptedPayload = decryptBitcoinLink(giftWrap, linkData.receiverPrivateKey);

      expect(decryptedPayload.type).toBe('bitcoinlink');
      expect(decryptedPayload.nwcUrl).toBe(testNwcUrl);
      expect(decryptedPayload.amount).toBe(testAmount);

      // Step 5: Claimer would now use the NWC URL to pay an invoice
      // (Not tested here as it requires external wallet)
    });

    it('should fail to decrypt with wrong private key', async () => {
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: testNwcUrl,
        amount: testAmount,
      };

      const { giftWrap } = await createBitcoinLink(payload);

      // Create another link to get a different private key
      const { receiverPrivateKey: wrongKey } = await createBitcoinLink(payload);

      // Attempting to decrypt with wrong key should fail
      expect(() => decryptBitcoinLink(giftWrap, wrongKey)).toThrow();
    });

    it('should work with multiple links using same NWC URL', async () => {
      // Simulate creating multiple links for distribution
      const numberOfLinks = 5;
      const links: Array<{ url: string; eventId: string }> = [];

      for (let i = 0; i < numberOfLinks; i++) {
        const payload: BitcoinLinkPayload = {
          type: 'bitcoinlink',
          nwcUrl: testNwcUrl,
          amount: testAmount,
        };

        const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
        const url = createClaimUrl(giftWrap.id, receiverPrivateKey, testAmount);

        links.push({ url, eventId: giftWrap.id });
      }

      // All links should be unique
      const uniqueEventIds = new Set(links.map(l => l.eventId));
      expect(uniqueEventIds.size).toBe(numberOfLinks);

      const uniqueUrls = new Set(links.map(l => l.url));
      expect(uniqueUrls.size).toBe(numberOfLinks);
    });

    it('should handle special characters in NWC URL', async () => {
      // NWC URL with special characters
      const specialNwcUrl = 'nostr+walletconnect://pubkey123?relay=wss://relay.com&secret=abc%20xyz&extra=true';

      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: specialNwcUrl,
        amount: testAmount,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);

      expect(decrypted.nwcUrl).toBe(specialNwcUrl);
    });

    it('should handle minimum and maximum amounts', async () => {
      // Note: 21M BTC in sats (2.1e15) exceeds Number.MAX_SAFE_INTEGER (9e15),
      // but we use a smaller realistic value here to avoid precision issues
      const amounts = [1, 2100000000000000]; // 1 sat and 21M BTC in sats

      for (const amount of amounts) {
        const payload: BitcoinLinkPayload = {
          type: 'bitcoinlink',
          nwcUrl: testNwcUrl,
          amount,
        };

        const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
        const url = createClaimUrl(giftWrap.id, receiverPrivateKey, amount);

        // Decode and verify
        const encodedPart = url.split('/claim/')[1];
        const linkData = decodeLink(encodedPart);
        expect(linkData.amountSats).toBe(amount);

        // Decrypt and verify
        const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);
        expect(decrypted.amount).toBe(amount);
      }
    });
  });

  describe('link data structure', () => {
    it('should create valid EncodedLink structure', async () => {
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: testNwcUrl,
        amount: testAmount,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      const relays = ['wss://test.relay'];
      const url = createClaimUrl(giftWrap.id, receiverPrivateKey, testAmount, relays);

      const encodedPart = url.split('/claim/')[1];
      const linkData = decodeLink(encodedPart);

      // Check structure
      expect(typeof linkData.eventId).toBe('string');
      expect(typeof linkData.receiverPrivateKey).toBe('string');
      expect(Array.isArray(linkData.relays)).toBe(true);
      expect(typeof linkData.amountSats).toBe('number');

      // Check key lengths
      expect(linkData.eventId.length).toBe(64); // Event ID is 32 bytes hex
      expect(linkData.receiverPrivateKey.length).toBe(64); // Private key is 32 bytes hex
    });
  });

  describe('error scenarios', () => {
    it('should fail with tampered gift wrap content', async () => {
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: testNwcUrl,
        amount: testAmount,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      
      const tamperedGiftWrap = {
        ...giftWrap,
        content: giftWrap.content.substring(0, giftWrap.content.length - 10) + 'xxxxxxxxxx',
      };

      expect(() => decryptBitcoinLink(tamperedGiftWrap, receiverPrivateKey)).toThrow();
    });

    it('should fail with partial private key', async () => {
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: testNwcUrl,
        amount: testAmount,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      const partialKey = receiverPrivateKey.substring(0, 32);

      expect(() => decryptBitcoinLink(giftWrap, partialKey)).toThrow();
    });

    it('should detect amount mismatch between URL and payload', async () => {
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: testNwcUrl,
        amount: 1000,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      const url = createClaimUrl(giftWrap.id, receiverPrivateKey, 2000);
      
      const encodedPart = url.split('/claim/')[1];
      const linkData = decodeLink(encodedPart);
      
      // URL says 2000
      expect(linkData.amountSats).toBe(2000);
      
      // Payload says 1000
      const decrypted = decryptBitcoinLink(giftWrap, linkData.receiverPrivateKey);
      expect(decrypted.amount).toBe(1000);
    });
  });

  describe('relay configurations', () => {
    it('should work with single relay', async () => {
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: testNwcUrl,
        amount: testAmount,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      const url = createClaimUrl(giftWrap.id, receiverPrivateKey, testAmount, ['wss://single.relay']);

      const encodedPart = url.split('/claim/')[1];
      const linkData = decodeLink(encodedPart);

      expect(linkData.relays).toEqual(['wss://single.relay']);
    });

    it('should work with many relays', async () => {
      const manyRelays = Array(10).fill(null).map((_, i) => `wss://relay${i}.com`);

      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: testNwcUrl,
        amount: testAmount,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      const url = createClaimUrl(giftWrap.id, receiverPrivateKey, testAmount, manyRelays);

      const encodedPart = url.split('/claim/')[1];
      const linkData = decodeLink(encodedPart);

      expect(linkData.relays).toEqual(manyRelays);
    });

    it('should work with empty relay list', async () => {
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: testNwcUrl,
        amount: testAmount,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      const url = createClaimUrl(giftWrap.id, receiverPrivateKey, testAmount, []);

      const encodedPart = url.split('/claim/')[1];
      const linkData = decodeLink(encodedPart);

      expect(linkData.relays).toEqual([]);
    });
  });

  describe('concurrent operations', () => {
    it('should handle 20 concurrent link creations', async () => {
      const promises = Array(20).fill(null).map(async (_, i) => {
        const payload: BitcoinLinkPayload = {
          type: 'bitcoinlink',
          nwcUrl: testNwcUrl,
          amount: testAmount + i,
        };

        const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
        const url = createClaimUrl(giftWrap.id, receiverPrivateKey, testAmount + i);

        return { giftWrap, receiverPrivateKey, url, amount: testAmount + i };
      });

      const results = await Promise.all(promises);

      const eventIds = new Set(results.map(r => r.giftWrap.id));
      expect(eventIds.size).toBe(20);

      for (const { giftWrap, receiverPrivateKey, amount } of results) {
        const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);
        expect(decrypted.amount).toBe(amount);
      }
    });
  });

  describe('payload integrity', () => {
    it('should preserve NWC URL through full flow', async () => {
      const nwcUrls = [
        'nostr+walletconnect://a?relay=wss://r.com&secret=s',
        'nostr+walletconnect://' + 'a'.repeat(64) + '?relay=wss://relay.damus.io&secret=' + 'x'.repeat(64),
        'nostr+walletconnect://pubkey?relay=wss://r1.com&relay=wss://r2.com&secret=test',
      ];

      for (const nwcUrl of nwcUrls) {
        const payload: BitcoinLinkPayload = {
          type: 'bitcoinlink',
          nwcUrl,
          amount: testAmount,
        };

        const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
        const url = createClaimUrl(giftWrap.id, receiverPrivateKey, testAmount);
        
        const encodedPart = url.split('/claim/')[1];
        const linkData = decodeLink(encodedPart);
        const decrypted = decryptBitcoinLink(giftWrap, linkData.receiverPrivateKey);

        expect(decrypted.nwcUrl).toBe(nwcUrl);
      }
    });

    it('should handle unicode in NWC URL', async () => {
      const unicodeNwcUrl = 'nostr+walletconnect://pubkey?relay=wss://r.com&secret=秘密🔐';
      
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl: unicodeNwcUrl,
        amount: testAmount,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      const decrypted = decryptBitcoinLink(giftWrap, receiverPrivateKey);

      expect(decrypted.nwcUrl).toBe(unicodeNwcUrl);
    });
  });
});
