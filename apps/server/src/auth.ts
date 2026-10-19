import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** scrypt hash, stored as scrypt$N$r$p$salt$hash (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, 32, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64url'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem });
  return timingSafeEqual(actual, expected);
}

/** Hash used to store session tokens and link codes: the database never holds a token that works. */
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('base64url');

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const MIN_PASSWORD = 12;

/**
 * Counts failed attempts per key (IP and email) in a sliding window, in memory: enough for one server.
 * A key over the limit is refused until its oldest failure leaves the window.
 */
export class Throttle {
  private readonly failures = new Map<string, number[]>();
  constructor(private readonly limit = 10, private readonly windowMs = 15 * 60 * 1000) {}

  private recent(key: string, at: number): number[] {
    const kept = (this.failures.get(key) ?? []).filter(t => at - t < this.windowMs);
    if (kept.length) this.failures.set(key, kept); else this.failures.delete(key);
    return kept;
  }

  /** Seconds to wait before trying again, or 0. */
  retryAfter(keys: string[], at = Date.now()): number {
    let wait = 0;
    for (const key of keys) {
      const list = this.recent(key, at);
      if (list.length >= this.limit) wait = Math.max(wait, Math.ceil((list[0]! + this.windowMs - at) / 1000));
    }
    return wait;
  }

  fail(keys: string[], at = Date.now()): void {
    for (const key of keys) this.failures.set(key, [...this.recent(key, at), at]);
  }

  clear(keys: string[]): void {
    for (const key of keys) this.failures.delete(key);
  }
}
