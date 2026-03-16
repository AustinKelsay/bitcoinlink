import { ensureLnurlPayResponse, extractInvoiceFromCallbackPayload } from '../../src/lib/nostr/claim-utils';

describe('claim-utils LNURL validation', () => {
  it('accepts valid LNURL pay payload and returns callback', () => {
    const callback = ensureLnurlPayResponse(
      {
        tag: 'payRequest',
        callback: 'https://example.com/lnurl/cb',
        minSendable: 1000,
        maxSendable: 500000,
      },
      2000
    );

    expect(callback).toBe('https://example.com/lnurl/cb');
  });

  it('rejects non-payRequest tag', () => {
    expect(() =>
      ensureLnurlPayResponse(
        {
          tag: 'withdrawRequest',
          callback: 'https://example.com/lnurl/cb',
          minSendable: 1000,
          maxSendable: 500000,
        },
        2000
      )
    ).toThrow('Invalid LNURL-pay tag');
  });

  it('rejects out-of-range amount', () => {
    expect(() =>
      ensureLnurlPayResponse(
        {
          tag: 'payRequest',
          callback: 'https://example.com/lnurl/cb',
          minSendable: 5000,
          maxSendable: 6000,
        },
        2000
      )
    ).toThrow('LNURL-pay amount out of range');
  });

  it('extracts invoice from callback payload', () => {
    const invoice = extractInvoiceFromCallbackPayload({ pr: 'lnbc10u1ptestinvoice' });
    expect(invoice).toBe('lnbc10u1ptestinvoice');
  });

  it('rejects callback payload without invoice', () => {
    expect(() => extractInvoiceFromCallbackPayload({})).toThrow('No invoice returned from LNURL callback');
  });
});
