/**
 * Shared utility for generating Bitcoin Links from an NWC URL.
 * Used by both the home page and MutinyModal.
 */

import { BitcoinLinkNostrClient } from './client';
import { createBitcoinLink } from './gift-wrap';
import { createClaimUrl } from './link-encoder';
import type { BitcoinLinkPayload } from './types';

/**
 * Options for generating Bitcoin links.
 */
export interface GenerateLinksOptions {
  /** The NWC URL to embed in each link */
  nwcUrl: string;
  /** Number of links to generate */
  numberOfLinks: number;
  /** Amount in satoshis for each link */
  satsPerLink: number;
  /** Optional custom relays (uses defaults if not provided) */
  relays?: string[];
}

/**
 * Generate multiple Bitcoin Links from an NWC URL.
 * Creates gift-wrapped events and publishes them to Nostr relays.
 *
 * @param options - The generation options
 * @returns Array of claim URLs
 * @throws If publishing fails or connection errors occur
 */
export async function generateLinksFromNWC(
  options: GenerateLinksOptions
): Promise<string[]> {
  const { nwcUrl, numberOfLinks, satsPerLink, relays } = options;

  if (numberOfLinks < 1) {
    throw new Error('numberOfLinks must be at least 1');
  }
  if (satsPerLink < 1) {
    throw new Error('satsPerLink must be at least 1');
  }

  const client = new BitcoinLinkNostrClient(relays);
  const links: string[] = [];

  try {
    await client.connect();

    for (let i = 0; i < numberOfLinks; i++) {
      const payload: BitcoinLinkPayload = {
        type: 'bitcoinlink',
        nwcUrl,
        amount: satsPerLink,
      };

      const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
      await client.publish(giftWrap);

      const claimUrl = createClaimUrl(
        giftWrap.id,
        receiverPrivateKey,
        satsPerLink,
        client.getRelays()
      );
      links.push(claimUrl);
    }

    return links;
  } finally {
    client.close();
  }
}
