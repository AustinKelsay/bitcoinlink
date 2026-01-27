/**
 * URL encoding/decoding for Bitcoin Links
 * Uses base64url encoding for compact, URL-safe representation
 */

import type { EncodedLink } from './types';
import { DEFAULT_RELAYS } from './relays';

/**
 * Encode link data to a base64url string.
 * Uses URL-safe base64 encoding without padding.
 *
 * @param link - The link data to encode
 * @returns Base64url encoded string
 */
export function encodeLink(link: EncodedLink): string {
  const json = JSON.stringify(link);
  // In browser, use btoa; in Node, use Buffer
  const base64 = typeof btoa !== 'undefined'
    ? btoa(json)
    : Buffer.from(json).toString('base64');
  // Convert to base64url: replace + with -, / with _, remove trailing =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a base64url string back to link data.
 *
 * @param encoded - Base64url encoded string
 * @returns The decoded link data
 * @throws If the string cannot be decoded
 */
export function decodeLink(encoded: string): EncodedLink {
  // Convert from base64url to standard base64
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  // Decode
  const json = typeof atob !== 'undefined'
    ? atob(base64)
    : Buffer.from(base64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

/**
 * Create an EncodedLink object from its constituent parts.
 *
 * @param eventId - The gift wrap event ID
 * @param receiverPrivateKey - The receiver's private key
 * @param amountSats - The amount in satoshis
 * @param relays - Optional custom relay list (defaults to DEFAULT_RELAYS)
 * @returns The EncodedLink object
 */
function createEncodedLink(
  eventId: string,
  receiverPrivateKey: string,
  amountSats: number,
  relays: string[] = DEFAULT_RELAYS
): EncodedLink {
  return {
    eventId,
    receiverPrivateKey,
    relays,
    amountSats,
  };
}

/**
 * Create a full claim URL from link data.
 *
 * @param eventId - The gift wrap event ID
 * @param receiverPrivateKey - The receiver's private key
 * @param amountSats - The amount in satoshis
 * @param relays - Optional custom relay list (defaults to DEFAULT_RELAYS)
 * @returns The full claim URL
 */
export function createClaimUrl(
  eventId: string,
  receiverPrivateKey: string,
  amountSats: number,
  relays: string[] = DEFAULT_RELAYS
): string {
  const link = createEncodedLink(eventId, receiverPrivateKey, amountSats, relays);
  const encoded = encodeLink(link);
  return `https://bitcoinlink.app/claim/${encoded}`;
}

/**
 * Create a relative claim path (for use within the app).
 *
 * @param eventId - The gift wrap event ID
 * @param receiverPrivateKey - The receiver's private key
 * @param amountSats - The amount in satoshis
 * @param relays - Optional custom relay list (defaults to DEFAULT_RELAYS)
 * @returns The claim path (without domain)
 */
export function createClaimPath(
  eventId: string,
  receiverPrivateKey: string,
  amountSats: number,
  relays: string[] = DEFAULT_RELAYS
): string {
  const link = createEncodedLink(eventId, receiverPrivateKey, amountSats, relays);
  const encoded = encodeLink(link);
  return `/claim/${encoded}`;
}
