import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { hashPassword, MIN_PASSWORD, normalizeEmail, Throttle, tokenHash, verifyPassword } from './auth.ts';
import { isLocal, type Config } from './config.ts';
import { randomToken } from './crypto.ts';
import { DEFAULT_TENANT, now, type Db, type LinkKind, type UserRow } from './db.ts';

export const SESSION = 'fls_session';
/** A session ends after 12 hours without requests, and after 7 days in any case. */
const IDLE_MS = 12 * 60 * 60 * 1000;
const MAX_MS = 7 * 24 * 60 * 60 * 1000;
/** last_seen_at is written at most this often, not on every request. */
const TOUCH_MS = 5 * 60 * 1000;

const LINK_DAYS: Record<LinkKind, number> = { invite: 14, reset: 1 };

export interface SessionUser { id: string; tenant: string; email: string; name: string; sessionId: string }

const email = z.string().trim().max(254).email().transform(normalizeEmail);
const password = z.string().min(MIN_PASSWORD).max(200);
const userName = z.string().trim().min(1).max(80);

const fail = (statusCode: number, message: string, extra: object = {}) => Object.assign(new Error(message), { statusCode, ...extra });

/** Creates a one-time link (invite or password reset) and returns its code; only the hash is stored. */
export async function createLink(db: Db, kind: LinkKind, to: string, days = LINK_DAYS[kind]): Promise<string> {
  const code = randomToken(24);
  await db.createLink({ idHash: tokenHash(code), kind, email: normalizeEmail(to), expiresAt: new Date(Date.now() + days * 86400000).toISOString() });
  return code;
}

export const linkUrl = (appUrl: string, kind: LinkKind, code: string) => `${appUrl}/?${kind}=${encodeURIComponent(code)}`;

/**
 * Accounts and sessions: sign up (with an invite unless signup is open), log in with email and password,
 * reset a password with a one-time link, change name and password. The session cookie carries a random
 * token; the database keeps its hash, so a copy of the database opens no session.
 */
export function registerAccounts(app: FastifyInstance, o: { db: Db; config: Config; prepareTenant?: (tenant: string) => Promise<void> }) {
  const { db, config } = o;
  const secure = config.appUrl.startsWith('https://');
  const throttle = new Throttle();

  const startSession = async (reply: FastifyReply, user: UserRow) => {
    const token = randomToken(32);
    await db.createSession({ idHash: tokenHash(token), userId: user.id, expiresAt: new Date(Date.now() + IDLE_MS).toISOString() });
    await db.touchLogin(user.id);
    await o.prepareTenant?.(user.tenant_id);
    reply.setCookie(SESSION, token, { signed: true, httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: MAX_MS / 1000 });
    return { authenticated: true, user: { name: user.name, email: user.email } };
  };

  /** The signed-in user, or null. Keeps the session alive while it is used. */
  const sessionUser = async (req: FastifyRequest): Promise<SessionUser | null> => {
    const raw = req.cookies[SESSION];
    const unsigned = raw ? req.unsignCookie(raw) : null;
    if (!unsigned?.valid || !unsigned.value) return null;
    const found = await db.getSession(tokenHash(unsigned.value));
    if (!found) return null;
    const { session, user } = found;
    const at = Date.now();
    if (at - Date.parse(session.last_seen_at) > TOUCH_MS) {
      const expires = Math.min(at + IDLE_MS, Date.parse(session.created_at) + MAX_MS);
      await db.touchSession(session.id, new Date(expires).toISOString());
    }
    return { id: user.id, tenant: user.tenant_id, email: user.email, name: user.name, sessionId: session.id };
  };

  /** No account yet on a local install: the first one needs no invite. */
  const openFirstAccount = async () => isLocal(config.appUrl) && (await db.countUsers()) === 0;

  const throttled = (reply: FastifyReply, keys: string[]) => {
    const wait = throttle.retryAfter(keys);
    if (!wait) return false;
    reply.header('Retry-After', String(wait)).code(429).send({ error: 'Too many attempts. Try again later.', code: 'THROTTLED', retryAfter: wait });
    return true;
  };

  app.get('/api/session', async req => {
    const user = await sessionUser(req);
    return {
      authenticated: !!user, user: user ? { name: user.name, email: user.email } : null,
      signup: config.signup === 'open' || await openFirstAccount() ? 'open' : 'invite'
    };
  });

  app.post('/api/session', async (req, reply) => {
    const body = z.object({ email, password: z.string().max(200) }).parse(req.body);
    const keys = [`ip:${req.ip}`, `email:${body.email}`];
    if (throttled(reply, keys)) return reply;
    const user = await db.getUserByEmail(body.email);
    // Without an account the password is still hashed, so the answer takes as long either way.
    const ok = user ? await verifyPassword(body.password, user.password_hash) : (await hashPassword(body.password), false);
    if (!user || !ok) {
      throttle.fail(keys);
      return reply.code(401).send({ error: 'Wrong email or password.', code: 'WRONG_LOGIN' });
    }
    throttle.clear([`email:${body.email}`]);
    await db.audit({ tenant: user.tenant_id, actor: user.email, action: 'session.login' });
    return startSession(reply, user);
  });

  app.delete('/api/session', async (req, reply) => {
    const user = await sessionUser(req);
    if (user) await db.deleteSession(user.sessionId);
    reply.clearCookie(SESSION, { path: '/' });
    return { authenticated: false };
  });

  /** What a link is for, so the page can show the email it belongs to. */
  app.get('/api/account/link', async req => {
    const q = z.object({ kind: z.enum(['invite', 'reset']), code: z.string().max(100) }).parse(req.query);
    const to = await db.peekLink(tokenHash(q.code), q.kind);
    if (!to) throw fail(404, 'This link is not valid any more. Ask for a new one.', { code: 'LINK_INVALID' });
    return { email: to };
  });

  app.post('/api/account', async (req, reply) => {
    const body = z.object({ name: userName, email, password, invite: z.string().max(100).optional() }).parse(req.body);
    if (throttled(reply, [`ip:${req.ip}`])) return reply;
    const needsInvite = config.signup === 'invite' && !await openFirstAccount();
    const inviteHash = body.invite ? tokenHash(body.invite) : null;
    if (needsInvite) {
      // The invite is for one email address: the link can't be passed on to someone else.
      const invited = inviteHash ? await db.peekLink(inviteHash, 'invite') : undefined;
      if (invited !== body.email) {
        throttle.fail([`ip:${req.ip}`]);
        throw fail(403, 'You need an invite for this email address to create an account.', { code: 'INVITE_REQUIRED' });
      }
    }
    if (await db.getUserByEmail(body.email)) throw fail(409, 'An account with this email already exists: log in instead.', { code: 'EMAIL_TAKEN' });
    // The orgs and change sets of a single-user install made before accounts go to its first account.
    const tenant = await db.hasUnclaimedData() && (await db.countUsers()) === 0 ? DEFAULT_TENANT : randomToken(12);
    const passwordHash = await hashPassword(body.password);
    const user = await db.sql.tx(async sql => {
      if (needsInvite && !await db.useLink(inviteHash!, 'invite', sql)) throw fail(403, 'This invite has already been used.', { code: 'INVITE_REQUIRED' });
      await sql.run('INSERT INTO users (id, tenant_id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [randomToken(12), tenant, body.email, body.name, passwordHash, now()]);
      return (await sql.get<UserRow>('SELECT * FROM users WHERE email = ?', [body.email]))!;
    });
    await db.audit({ tenant, actor: user.email, action: 'account.created', detail: needsInvite ? 'invite' : 'open' });
    return startSession(reply, user);
  });

  app.post('/api/account/reset', async (req, reply) => {
    const body = z.object({ code: z.string().max(100), password }).parse(req.body);
    if (throttled(reply, [`ip:${req.ip}`])) return reply;
    const idHash = tokenHash(body.code);
    const to = await db.peekLink(idHash, 'reset');
    const user = to ? await db.getUserByEmail(to) : undefined;
    if (!user || !await db.useLink(idHash, 'reset')) {
      throttle.fail([`ip:${req.ip}`]);
      throw fail(404, 'This link is not valid any more. Ask for a new one.', { code: 'LINK_INVALID' });
    }
    await db.setPassword(user.id, await hashPassword(body.password));
    // A new password closes every session opened with the old one.
    await db.deleteUserSessions(user.id);
    await db.audit({ tenant: user.tenant_id, actor: user.email, action: 'account.password_reset' });
    return startSession(reply, user);
  });

  app.patch('/api/account', async req => {
    const me = await sessionUser(req);
    if (!me) throw fail(401, 'Login required');
    const body = z.object({ name: userName.optional(), currentPassword: z.string().max(200).optional(), newPassword: password.optional() }).parse(req.body);
    if (body.name) await db.sql.run('UPDATE users SET name = ? WHERE id = ?', [body.name, me.id]);
    if (body.newPassword) {
      const user = (await db.getUser(me.id))!;
      if (!body.currentPassword || !await verifyPassword(body.currentPassword, user.password_hash)) throw fail(403, 'The current password is wrong.', { code: 'WRONG_PASSWORD' });
      await db.setPassword(me.id, await hashPassword(body.newPassword));
      // Other devices are logged out; this session stays.
      await db.sql.run('DELETE FROM sessions WHERE user_id = ? AND id <> ?', [me.id, me.sessionId]);
      await db.audit({ tenant: me.tenant, actor: me.email, action: 'account.password_changed' });
    }
    const user = (await db.getUser(me.id))!;
    return { name: user.name, email: user.email };
  });

  return { sessionUser };
}
