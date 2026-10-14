import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** AES-256-GCM encryption for tokens at rest. Output: base64(iv).base64(tag).base64(data). */
export class TokenCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = createHash('sha256').update(`${secret}:token-encryption`).digest();
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64')).join('.');
  }

  decrypt(payload: string): string {
    const [iv, tag, data] = payload.split('.').map(p => Buffer.from(p, 'base64'));
    if (!iv || !tag || !data) throw new Error('Malformed encrypted payload.');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

const b64url = (buf: Buffer) => buf.toString('base64url');

export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = b64url(randomBytes(48));
  return { verifier, challenge: b64url(createHash('sha256').update(verifier).digest()) };
}

export const randomToken = (bytes = 24) => b64url(randomBytes(bytes));
