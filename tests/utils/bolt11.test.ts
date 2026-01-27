/**
 * Tests for BOLT11 Lightning invoice utilities
 */

import {
  getBolt11Description,
  getBolt11Amount,
  validateBolt11,
} from '../../src/utils/bolt11';

describe('BOLT11 Utilities', () => {
  describe('getBolt11Description', () => {
    it('should throw for completely invalid input', () => {
      expect(() => getBolt11Description('not-an-invoice')).toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => getBolt11Description('')).toThrow();
    });

    it('should throw for invalid bech32', () => {
      expect(() => getBolt11Description('lnbc1invalid')).toThrow();
    });
  });

  describe('getBolt11Amount', () => {
    it('should throw for invalid invoice', () => {
      expect(() => getBolt11Amount('invalid')).toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => getBolt11Amount('')).toThrow();
    });

    it('should throw for malformed bech32', () => {
      expect(() => getBolt11Amount('lnbc1xyz')).toThrow();
    });
  });

  describe('validateBolt11', () => {
    it('should return invalid for malformed invoice', () => {
      const result = validateBolt11('not-a-valid-invoice');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid Bolt11 invoice');
    });

    it('should return invalid for empty string', () => {
      const result = validateBolt11('');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid Bolt11 invoice');
    });

    it('should return invalid for invoice with bad prefix', () => {
      const result = validateBolt11('lnbc1invalid');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid Bolt11 invoice');
    });

    it('should include reason when validation fails', () => {
      const result = validateBolt11('garbage-data');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(typeof result.reason).toBe('string');
    });

    it('should return ValidationResult type', () => {
      const result = validateBolt11('test');
      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should handle invoice with special characters gracefully', () => {
      expect(() => getBolt11Description('lnbc1🎉💥')).toThrow();
    });

    it('should handle very long invalid input', () => {
      const longInput = 'lnbc1' + 'a'.repeat(10000);
      expect(() => validateBolt11(longInput)).not.toThrow();
      const result = validateBolt11(longInput);
      expect(result.valid).toBe(false);
    });

    it('should handle null-like inputs gracefully (returns invalid)', () => {
      // validateBolt11 catches errors and returns {valid: false}
      const nullResult = validateBolt11(null as unknown as string);
      expect(nullResult.valid).toBe(false);

      const undefinedResult = validateBolt11(undefined as unknown as string);
      expect(undefinedResult.valid).toBe(false);
    });

    it('should return consistent structure for all invalid inputs', () => {
      const invalidInputs = ['', 'abc', 'lnbc1xyz', null, undefined, 123];

      for (const input of invalidInputs) {
        const result = validateBolt11(input as unknown as string);
        expect(result).toHaveProperty('valid');
        expect(result.valid).toBe(false);
        expect(result).toHaveProperty('reason');
      }
    });
  });
});
