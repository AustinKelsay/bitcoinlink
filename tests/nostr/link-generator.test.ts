/**
 * Tests for link generator utility
 */

import { generateLinksFromNWC } from '../../src/lib/nostr/link-generator';

// Note: These tests require mocking the Nostr client for full coverage.
// For now, we test the validation logic.

describe('Link Generator', () => {
  describe('generateLinksFromNWC validation', () => {
    it('should throw error for numberOfLinks less than 1', async () => {
      await expect(
        generateLinksFromNWC({
          nwcUrl: 'nostr+walletconnect://test?relay=wss://test.com&secret=abc',
          numberOfLinks: 0,
          satsPerLink: 100,
        })
      ).rejects.toThrow('numberOfLinks must be at least 1');
    });

    it('should throw error for negative numberOfLinks', async () => {
      await expect(
        generateLinksFromNWC({
          nwcUrl: 'nostr+walletconnect://test?relay=wss://test.com&secret=abc',
          numberOfLinks: -1,
          satsPerLink: 100,
        })
      ).rejects.toThrow('numberOfLinks must be at least 1');
    });

    it('should throw error for satsPerLink less than 1', async () => {
      await expect(
        generateLinksFromNWC({
          nwcUrl: 'nostr+walletconnect://test?relay=wss://test.com&secret=abc',
          numberOfLinks: 1,
          satsPerLink: 0,
        })
      ).rejects.toThrow('satsPerLink must be at least 1');
    });

    it('should throw error for negative satsPerLink', async () => {
      await expect(
        generateLinksFromNWC({
          nwcUrl: 'nostr+walletconnect://test?relay=wss://test.com&secret=abc',
          numberOfLinks: 1,
          satsPerLink: -100,
        })
      ).rejects.toThrow('satsPerLink must be at least 1');
    });
  });
});
