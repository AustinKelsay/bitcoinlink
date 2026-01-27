/**
 * Types for Nostr-based Bitcoin Link
 */

import type { NostrEvent } from 'snstr';

/** Payload stored inside the gift-wrapped event */
export interface BitcoinLinkPayload {
  type: 'bitcoinlink';
  nwcUrl: string;
  amount: number; // sats
}

/** Result from creating a bitcoin link */
export interface BitcoinLinkResult {
  giftWrap: NostrEvent;
  receiverPrivateKey: string;
  receiverPublicKey: string;
}

/** Data encoded in the claim URL */
export interface EncodedLink {
  eventId: string;
  receiverPrivateKey: string;
  relays: string[];
  amountSats: number;
}

/** Link info displayed on the claim page */
export interface LinkInfo {
  amount: number;
  isClaimed: boolean;
}

/** Parsed input type for claiming */
export interface ParsedInput {
  type: 'lnurl' | 'invoice' | 'address';
  data: string;
}

/** WebLN interface for browser extension wallets */
export interface WebLN {
  enable: () => Promise<void>;
  makeInvoice: (args: { amount: number; comment: string }) => Promise<{ paymentRequest: string }>;
}

declare global {
  interface Window {
    webln?: WebLN;
  }
}

export type { NostrEvent };
