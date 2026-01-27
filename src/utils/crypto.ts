import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export interface EncryptedData {
  encryptedUrl: string;
  secret: string;
}

/**
 * Encrypts a URL using AES-256-CBC with a random key and IV.
 * The IV is prepended to the encrypted data (hex encoded).
 */
export function encryptNWCUrl(url: string): EncryptedData {
  const secret = crypto.randomBytes(32).toString('hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const keyBuffer = Buffer.from(secret, 'hex');

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    keyBuffer as unknown as crypto.CipherKey,
    iv as unknown as crypto.BinaryLike
  );
  let encrypted = cipher.update(url, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Prepend IV to encrypted data
  const encryptedUrl = iv.toString('hex') + encrypted;

  return { encryptedUrl, secret };
}

/**
 * Decrypts a URL that was encrypted with encryptNWCUrl.
 * Expects the IV to be prepended to the encrypted data.
 */
export function decryptNWCUrl(encryptedUrl: string, secret: string): string {
  const keyBuffer = Buffer.from(secret, 'hex');

  // Extract IV from the beginning of the encrypted data
  const ivBuffer = Buffer.from(encryptedUrl.slice(0, IV_LENGTH * 2), 'hex');
  const encryptedData = encryptedUrl.slice(IV_LENGTH * 2);

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    keyBuffer as unknown as crypto.CipherKey,
    ivBuffer as unknown as crypto.BinaryLike
  );
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
