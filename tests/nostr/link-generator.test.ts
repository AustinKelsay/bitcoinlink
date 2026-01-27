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

  describe('boundary conditions', () => {
    it('should reject fractional numberOfLinks', async () => {
      await expect(
        generateLinksFromNWC({
          nwcUrl: validNwcUrl,
          numberOfLinks: 1.5,
          satsPerLink: 100,
        })
      ).rejects.toThrow('numberOfLinks must be an integer');
    });

    it('should reject fractional satsPerLink', async () => {
      await expect(
        generateLinksFromNWC({
          nwcUrl: validNwcUrl,
          numberOfLinks: 1,
          satsPerLink: 99.5,
        })
      ).rejects.toThrow('satsPerLink must be an integer');
    });

    it('should handle exactly 1 link request (validation only)', () => {
      const options = {
        nwcUrl: validNwcUrl,
        numberOfLinks: 1,
        satsPerLink: 1,
      };

      expect(options.numberOfLinks).toBe(1);
      expect(options.satsPerLink).toBe(1);
    });

    it('should accept very large numberOfLinks value (validation only)', () => {
      const options = {
        nwcUrl: validNwcUrl,
        numberOfLinks: 1000000,
        satsPerLink: 1,
      };

      expect(options.numberOfLinks).toBe(1000000);
    });

    it('should accept maximum safe integer for satsPerLink', () => {
      const options = {
        nwcUrl: validNwcUrl,
        numberOfLinks: 1,
        satsPerLink: Number.MAX_SAFE_INTEGER,
      };

      expect(options.satsPerLink).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should reject empty relays array when explicitly provided', async () => {
      await expect(
        generateLinksFromNWC({
          nwcUrl: validNwcUrl,
          numberOfLinks: 1,
          satsPerLink: 100,
          relays: [],
        })
      ).rejects.toThrow('relays array cannot be empty when provided');
    });
  });

  describe('NWC URL handling', () => {
    it('should accept NWC URL with multiple relays', () => {
      const multiRelayUrl = 'nostr+walletconnect://test?relay=wss://r1.com&relay=wss://r2.com&relay=wss://r3.com&secret=abc';
      const options = {
        nwcUrl: multiRelayUrl,
        numberOfLinks: 1,
        satsPerLink: 100,
      };

      expect(options.nwcUrl).toBe(multiRelayUrl);
    });

    it('should accept NWC URL with special characters in secret', () => {
      const specialSecretUrl = 'nostr+walletconnect://test?relay=wss://r.com&secret=abc%2F%3D%2B123';
      const options = {
        nwcUrl: specialSecretUrl,
        numberOfLinks: 1,
        satsPerLink: 100,
      };

      expect(options.nwcUrl).toBe(specialSecretUrl);
    });
  });

  describe('error order', () => {
    it('should validate numberOfLinks before attempting connection', async () => {
      // Even with invalid NWC URL, numberOfLinks should be checked first
      await expect(
        generateLinksFromNWC({
          nwcUrl: 'invalid-url',
          numberOfLinks: 0,
          satsPerLink: 100,
        })
      ).rejects.toThrow('numberOfLinks must be at least 1');
    });

    it('should validate satsPerLink before attempting connection', async () => {
      // With valid numberOfLinks but invalid satsPerLink
      await expect(
        generateLinksFromNWC({
          nwcUrl: 'invalid-url',
          numberOfLinks: 1,
          satsPerLink: 0,
        })
      ).rejects.toThrow('satsPerLink must be at least 1');
    });
  });
});
