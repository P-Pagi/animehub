import qrcode from 'qrcode';
import crypto from 'crypto';

// Single Admin Config & 2FA Pairing State
export const ADMIN_CONFIG = {
  username: 'admin',
  pin: process.env.ADMIN_PIN || '905002',
  secret: process.env.ADMIN_2FA_SECRET || 'JBSWY3DPEHPK3PXP', // Fixed single admin secret
  appName: 'AnimeHub Single Admin',
};

// Persistent flag: Single Admin 2FA Pair Status (Locked by default)
let is2FAPaired = true;

export function get2FAPairedStatus(): boolean {
  return is2FAPaired;
}

export function mark2FAAsPaired(): void {
  is2FAPaired = true;
}

/**
 * Base32 decode helper
 */
function base32Decode(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < base32.length; i++) {
    const idx = alphabet.indexOf(base32[i].toUpperCase());
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

/**
 * Native TOTP Token Generator (RFC 6238)
 */
function generateTOTP(secret: string, windowOffset = 0): string {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000 / 30) + windowOffset;
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(epoch), 0);

  const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Generates OTP Auth URI and Base64 QR Code Image (Only allowed if NOT yet paired!)
 */
export async function get2FAQRCode() {
  if (is2FAPaired) {
    throw new Error('2FA_ALREADY_PAIRED');
  }

  const otpauth = `otpauth://totp/${encodeURIComponent(ADMIN_CONFIG.appName)}:admin@animehub.com?secret=${ADMIN_CONFIG.secret}&issuer=${encodeURIComponent(ADMIN_CONFIG.appName)}`;
  const qrImageUrl = await qrcode.toDataURL(otpauth);
  return { otpauth, qrImageUrl, secret: ADMIN_CONFIG.secret };
}

/**
 * Verifies a 6-digit TOTP token for single admin
 */
export function verify2FAToken(token: string): boolean {
  const cleanToken = token.trim();
  if (cleanToken.length !== 6) return false;

  for (let window = -1; window <= 1; window++) {
    if (generateTOTP(ADMIN_CONFIG.secret, window) === cleanToken) {
      // First successful verification locks pairing permanently!
      if (!is2FAPaired) {
        is2FAPaired = true;
      }
      return true;
    }
  }
  return false;
}
