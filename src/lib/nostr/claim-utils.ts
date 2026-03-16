export interface LnurlPayResponse {
  tag?: string;
  callback?: string;
  minSendable?: number;
  maxSendable?: number;
}

export function ensureLnurlPayResponse(data: unknown, amountMsat: number): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid LNURL response payload');
  }

  const payload = data as LnurlPayResponse;
  if (payload.tag !== 'payRequest') {
    throw new Error('Invalid LNURL-pay tag');
  }

  if (!payload.callback || typeof payload.callback !== 'string') {
    throw new Error('LNURL-pay callback missing');
  }

  if (typeof payload.minSendable !== 'number' || typeof payload.maxSendable !== 'number') {
    throw new Error('LNURL-pay amount bounds missing');
  }

  if (amountMsat < payload.minSendable || amountMsat > payload.maxSendable) {
    throw new Error('LNURL-pay amount out of range');
  }

  return payload.callback;
}

export function extractInvoiceFromCallbackPayload(data: unknown): string {
  if (!data || typeof data !== 'object' || !('pr' in data)) {
    throw new Error('No invoice returned from LNURL callback');
  }

  const invoice = (data as { pr?: unknown }).pr;
  if (typeof invoice !== 'string' || invoice.trim().length === 0) {
    throw new Error('Invalid invoice returned from LNURL callback');
  }

  return invoice.trim();
}
