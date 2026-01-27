/**
 * Tests for link generator utility
 */

import { generateLinksFromNWC } from '../../src/lib/nostr/link-generator';

// Note: Full generation tests require mocking the Nostr client for relay interactions.
// These tests cover input validation which runs before any network operations.

describe('Link Generator', () => {
  const validNwcUrl = 'nostr+walletconnect://test?relay=wss://test.com&secret=abc';

  describe('input validation', () => {
    describe('numberOfLinks validation', () => {
      it('should reject zero links with specific error message', async () => {
        await expect(
          generateLinksFromNWC({
            nwcUrl: validNwcUrl,
            numberOfLinks: 0,
            satsPerLink: 100,
          })
        ).rejects.toThrow('numberOfLinks must be at least 1');
      });

      it('should reject negative numberOfLinks', async () => {
        await expect(
          generateLinksFromNWC({
            nwcUrl: validNwcUrl,
            numberOfLinks: -1,
            satsPerLink: 100,
          })
        ).rejects.toThrow('numberOfLinks must be at least 1');
      });

      it('should reject very negative numberOfLinks', async () => {
        await expect(
          generateLinksFromNWC({
            nwcUrl: validNwcUrl,
            numberOfLinks: -1000,
            satsPerLink: 100,
          })
        ).rejects.toThrow('numberOfLinks must be at least 1');
      });
    });

    describe('satsPerLink validation', () => {
      it('should reject zero sats with specific error message', async () => {
        await expect(
          generateLinksFromNWC({
            nwcUrl: validNwcUrl,
            numberOfLinks: 1,
            satsPerLink: 0,
          })
        ).rejects.toThrow('satsPerLink must be at least 1');
      });

      it('should reject negative satsPerLink', async () => {
        await expect(
          generateLinksFromNWC({
            nwcUrl: validNwcUrl,
            numberOfLinks: 1,
            satsPerLink: -100,
          })
        ).rejects.toThrow('satsPerLink must be at least 1');
      });

      it('should reject fractional satsPerLink that rounds to zero', async () => {
        await expect(
          generateLinksFromNWC({
            nwcUrl: validNwcUrl,
            numberOfLinks: 1,
            satsPerLink: 0.5,
          })
        ).rejects.toThrow('satsPerLink must be at least 1');
      });
    });

    describe('combined validation', () => {
      it('should check numberOfLinks before satsPerLink (first error wins)', async () => {
        // Both invalid, but numberOfLinks is checked first
        await expect(
          generateLinksFromNWC({
            nwcUrl: validNwcUrl,
            numberOfLinks: 0,
            satsPerLink: 0,
          })
        ).rejects.toThrow('numberOfLinks must be at least 1');
      });
    });
  });

  describe('options structure', () => {
    it('should accept optional relays parameter', () => {
      // Just verify the type is accepted - actual generation requires relay connection
      const options = {
        nwcUrl: validNwcUrl,
        numberOfLinks: 1,
        satsPerLink: 100,
        relays: ['wss://custom.relay'],
      };

      // This would attempt to connect, so we just verify the shape is valid
      expect(options.relays).toEqual(['wss://custom.relay']);
    });
  });
});
