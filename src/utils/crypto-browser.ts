const ALGORITHM = 'AES-CBC';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

export interface EncryptedData {
  encryptedUrl: string;
  secret: string;
}

/**
 * Generates cryptographically secure random bytes as hex string
 */
function randomBytesHex(length: number): string {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encrypts a URL using AES-256-CBC with a random key and IV.
 * The IV is prepended to the encrypted data (hex encoded).
 */
export async function encryptNWCUrl(url: string): Promise<EncryptedData> {
  const secret = randomBytesHex(KEY_LENGTH);
  const iv = new Uint8Array(IV_LENGTH);
  window.crypto.getRandomValues(iv);
  const keyData = hexToBytes(secret);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData as BufferSource,
    { name: ALGORITHM },
    false,
    ['encrypt']
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(url);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    data as BufferSource
  );

  const encryptedUrl = bytesToHex(iv) + bytesToHex(new Uint8Array(encrypted));

  return { encryptedUrl, secret };
}

/**
 * Decrypts a URL that was encrypted with encryptNWCUrl.
 * Expects the IV to be prepended to the encrypted data.
 */
export async function decryptNWCUrl(
  encryptedUrl: string,
  secret: string
): Promise<string> {
  const iv = hexToBytes(encryptedUrl.slice(0, IV_LENGTH * 2));
  const encryptedData = hexToBytes(encryptedUrl.slice(IV_LENGTH * 2));

  const keyData = hexToBytes(secret);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData as BufferSource,
    { name: ALGORITHM },
    false,
    ['decrypt']
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    encryptedData as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
