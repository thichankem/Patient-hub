import crypto from 'node:crypto';
import { env } from '../config/env';

// AES-256-GCM cho dữ liệu nhạy cảm (phone, insurance number).
// Format lưu DB: base64(iv).base64(authTag).base64(ciphertext)

const KEY = Buffer.from(env.AES_KEY, 'hex'); // 32 bytes
const IV_LENGTH = 12; // GCM khuyến nghị 12 bytes
const ALGO = 'aes-256-gcm';

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}

export function decrypt(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 3) {
    throw new Error('Ciphertext không đúng định dạng');
  }
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}
