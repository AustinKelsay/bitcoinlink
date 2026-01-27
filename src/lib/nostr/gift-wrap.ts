/**
 * Gift wrap creation and decryption for Bitcoin Links
 * Uses NIP-17 (gift wrap) with NIP-44 encryption
 */

import {
  createDirectMessage,
  decryptDirectMessage,
  generateKeypair,
  GIFT_WRAP_KIND,
} from 'snstr';
import type { NostrEvent } from 'snstr';
import type { BitcoinLinkPayload, BitcoinLinkResult } from './types';

/**
 * Create a gift-wrapped Bitcoin Link event.
 *
 * Generates ephemeral sender and receiver keypairs:
 * - Sender keypair: used to sign the inner message
 * - Receiver keypair: public key is the event target, private key goes in the URL
 *
 * @param payload - The Bitcoin Link payload containing NWC URL and amount
 * @returns The gift wrap event and receiver private key
 */
export async function createBitcoinLink(
  payload: BitcoinLinkPayload
): Promise<BitcoinLinkResult> {
  const receiver = await generateKeypair();
  const sender = await generateKeypair();

  const message = JSON.stringify(payload);
  const giftWrap = await createDirectMessage(
    message,
    sender.privateKey,
    receiver.publicKey
  );

  return {
    giftWrap,
    receiverPrivateKey: receiver.privateKey,
    receiverPublicKey: receiver.publicKey,
  };
}

/**
 * Validate that a payload has the required BitcoinLinkPayload structure.
 *
 * @param payload - The payload to validate
 * @throws If the payload is missing required fields or has invalid types
 */
function validatePayload(payload: unknown): asserts payload is BitcoinLinkPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid payload: expected an object');
  }

  const p = payload as Record<string, unknown>;

  if (p.type !== 'bitcoinlink') {
    throw new Error(`Invalid payload type: expected 'bitcoinlink', got '${p.type}'`);
  }

  if (typeof p.nwcUrl !== 'string' || p.nwcUrl.length === 0) {
    throw new Error('Invalid payload: nwcUrl must be a non-empty string');
  }

  if (typeof p.amount !== 'number' || !Number.isFinite(p.amount) || !Number.isInteger(p.amount) || p.amount < 1) {
    throw new Error('Invalid payload: amount must be a positive integer (satoshis)');
  }
}

/**
 * Decrypt a gift-wrapped Bitcoin Link to extract the payload.
 *
 * @param giftWrap - The kind 1059 gift wrap event
 * @param receiverPrivateKey - The receiver's private key from the claim URL
 * @returns The decrypted Bitcoin Link payload
 * @throws If the event is not a valid gift wrap or cannot be decrypted
 */
export function decryptBitcoinLink(
  giftWrap: NostrEvent,
  receiverPrivateKey: string
): BitcoinLinkPayload {
  if (giftWrap.kind !== GIFT_WRAP_KIND) {
    throw new Error(`Invalid event kind: expected ${GIFT_WRAP_KIND}, got ${giftWrap.kind}`);
  }

  const rumor = decryptDirectMessage(giftWrap, receiverPrivateKey);

  let payload: unknown;
  try {
    payload = JSON.parse(rumor.content);
  } catch {
    throw new Error('Invalid payload: content is not valid JSON');
  }

  validatePayload(payload);

  return payload;
}

export { GIFT_WRAP_KIND };
