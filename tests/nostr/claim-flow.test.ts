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
      const amounts = [1, 21000000 * 100000000]; // 1 sat and 21M BTC in sats

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
});
