/**
 * Tests for NWC payment functionality
 * Uses mocks to test payInvoiceWithNWC without real wallet connections
 */

import { payInvoiceWithNWC, isValidNWCUrl, getRelaysFromNWCUrl } from '../../src/lib/nostr/nwc-client';

// Mock snstr module
jest.mock('snstr', () => ({
  parseNWCURL: jest.fn((url: string) => {
    if (!url || !url.startsWith('nostr+walletconnect://')) {
      throw new Error('Invalid NWC URL');
    }
    const pubkey = url.split('://')[1]?.split('?')[0] || '';
    const params = new URLSearchParams(url.split('?')[1] || '');
    const relays = params.getAll('relay').map(r => decodeURIComponent(r));
    const secret = params.get('secret');
    
    if (!secret) {
      throw new Error('Missing secret');
    }
    
    return { pubkey, relays, secret };
  }),
  NostrWalletConnectClient: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    payInvoice: jest.fn(),
    disconnect: jest.fn().mockResolvedValue(undefined),
  })),
}));

const { NostrWalletConnectClient } = require('snstr');

describe('NWC Payment', () => {
  const VALID_PUBKEY = 'a'.repeat(64);
  const VALID_NWC_URL = `nostr+walletconnect://${VALID_PUBKEY}?relay=wss%3A%2F%2Frelay.test.com&secret=testsecret`;
  const VALID_INVOICE = 'lnbc10u1ptest';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('payInvoiceWithNWC', () => {
    it('should successfully pay an invoice and return preimage', async () => {
      const mockPreimage = 'abc123preimage456';
      const mockClient = {
        init: jest.fn().mockResolvedValue(undefined),
        payInvoice: jest.fn().mockResolvedValue({ preimage: mockPreimage }),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      const result = await payInvoiceWithNWC(VALID_NWC_URL, VALID_INVOICE);

      expect(result).toEqual({ preimage: mockPreimage });
      expect(mockClient.init).toHaveBeenCalledTimes(1);
      expect(mockClient.payInvoice).toHaveBeenCalledWith(VALID_INVOICE);
      expect(mockClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect even if payment fails', async () => {
      const mockClient = {
        init: jest.fn().mockResolvedValue(undefined),
        payInvoice: jest.fn().mockRejectedValue(new Error('Payment failed')),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      await expect(payInvoiceWithNWC(VALID_NWC_URL, VALID_INVOICE)).rejects.toThrow('Payment failed');
      expect(mockClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should throw if no preimage is returned', async () => {
      const mockClient = {
        init: jest.fn().mockResolvedValue(undefined),
        payInvoice: jest.fn().mockResolvedValue({}),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      await expect(payInvoiceWithNWC(VALID_NWC_URL, VALID_INVOICE))
        .rejects.toThrow('Payment failed: no preimage returned');
    });

    it('should throw if result is null', async () => {
      const mockClient = {
        init: jest.fn().mockResolvedValue(undefined),
        payInvoice: jest.fn().mockResolvedValue(null),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      await expect(payInvoiceWithNWC(VALID_NWC_URL, VALID_INVOICE))
        .rejects.toThrow('Payment failed: no preimage returned');
    });

    it('should throw if init fails', async () => {
      const mockClient = {
        init: jest.fn().mockRejectedValue(new Error('Connection failed')),
        payInvoice: jest.fn(),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      await expect(payInvoiceWithNWC(VALID_NWC_URL, VALID_INVOICE))
        .rejects.toThrow('Connection failed');
      expect(mockClient.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle INSUFFICIENT_BALANCE error', async () => {
      const mockClient = {
        init: jest.fn().mockResolvedValue(undefined),
        payInvoice: jest.fn().mockRejectedValue(new Error('INSUFFICIENT_BALANCE')),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      await expect(payInvoiceWithNWC(VALID_NWC_URL, VALID_INVOICE))
        .rejects.toThrow('INSUFFICIENT_BALANCE');
    });

    it('should handle timeout errors', async () => {
      const mockClient = {
        init: jest.fn().mockResolvedValue(undefined),
        payInvoice: jest.fn().mockRejectedValue(new Error('Timeout')),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      await expect(payInvoiceWithNWC(VALID_NWC_URL, VALID_INVOICE))
        .rejects.toThrow('Timeout');
    });

    it('should handle network errors during disconnect gracefully', async () => {
      const mockPreimage = 'preimage123';
      const mockClient = {
        init: jest.fn().mockResolvedValue(undefined),
        payInvoice: jest.fn().mockResolvedValue({ preimage: mockPreimage }),
        disconnect: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      // Should succeed - disconnect errors should not overwrite successful payment results
      const result = await payInvoiceWithNWC(VALID_NWC_URL, VALID_INVOICE);
      expect(result).toEqual({ preimage: mockPreimage });
      // Disconnect was still attempted
      expect(mockClient.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('payment flow edge cases', () => {
    it('should handle empty invoice string', async () => {
      const mockClient = {
        init: jest.fn().mockResolvedValue(undefined),
        payInvoice: jest.fn().mockRejectedValue(new Error('Invalid invoice')),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      await expect(payInvoiceWithNWC(VALID_NWC_URL, ''))
        .rejects.toThrow('Invalid invoice');
    });

    it('should handle very long invoice strings', async () => {
      const longInvoice = 'lnbc' + 'a'.repeat(10000);
      const mockClient = {
        init: jest.fn().mockResolvedValue(undefined),
        payInvoice: jest.fn().mockResolvedValue({ preimage: 'abc' }),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      const result = await payInvoiceWithNWC(VALID_NWC_URL, longInvoice);
      expect(result.preimage).toBe('abc');
      expect(mockClient.payInvoice).toHaveBeenCalledWith(longInvoice);
    });

    it('should properly sequence init -> pay -> disconnect', async () => {
      const callOrder: string[] = [];
      const mockClient = {
        init: jest.fn().mockImplementation(() => {
          callOrder.push('init');
          return Promise.resolve();
        }),
        payInvoice: jest.fn().mockImplementation(() => {
          callOrder.push('pay');
          return Promise.resolve({ preimage: 'test' });
        }),
        disconnect: jest.fn().mockImplementation(() => {
          callOrder.push('disconnect');
          return Promise.resolve();
        }),
      };
      NostrWalletConnectClient.mockImplementation(() => mockClient);

      await payInvoiceWithNWC(VALID_NWC_URL, VALID_INVOICE);

      expect(callOrder).toEqual(['init', 'pay', 'disconnect']);
    });
  });
});
