import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createLink, linkUrl, type SessionUser } from './accounts.ts';
import { normalizeEmail } from './auth.ts';
import { isLocal, type Config } from './config.ts';
import type { Db, LinkRow, UserRow } from './db.ts';

const fail = (statusCode: number, message: string, code: string) => Object.assign(new Error(message), { statusCode, code });

const linkStatus = (l: LinkRow, at = new Date().toISOString()) => l.used_at ? 'used' : l.expires_at <= at ? 'expired' : 'pending';

/**
 * The admin page: invites and accounts across the whole install. Only admins reach it; an admin
 * cannot disable or demote their own account, so the install never loses its last admin by mistake.
 */
export function registerAdmin(app: FastifyInstance, o: { db: Db; config: Config; who: (req: FastifyRequest) => { user: SessionUser } }) {
  const { db, config } = o;
  const admin = (req: FastifyRequest) => {
    const { user } = o.who(req);
    if (!user.isAdmin) throw fail(403, 'Only admins can do this.', 'ADMIN_ONLY');
    return user;
  };
  const target = async (req: FastifyRequest): Promise<UserRow> => {
    const user = await db.getUser((req.params as { id: string }).id);
    if (!user) throw fail(404, 'Account not found.', 'NOT_FOUND');
    return user;
  };
  const audit = (me: SessionUser, user: Pick<UserRow, 'tenant_id' | 'email'> | null, action: string, detail?: string) =>
    db.audit({ tenant: user?.tenant_id ?? me.tenant, actor: me.email, action, detail: [user?.email, detail].filter(Boolean).join(' · ') || undefined });

  app.get('/api/admin', async req => {
    admin(req);
    const [users, invites] = await Promise.all([db.listUsers(), db.listLinks('invite')]);
    return {
      // An install on localhost lets its first account in without an invite; that is all "open" means there.
      signup: config.signup === 'open' ? 'open' : 'invite', local: isLocal(config.appUrl),
      users: users.map(u => ({
        id: u.id, name: u.name, email: u.email, createdAt: u.created_at, lastLoginAt: u.last_login_at,
        isAdmin: !!u.is_admin, disabled: !!u.disabled_at, orgs: u.orgs, changeSets: u.change_sets, sessions: u.sessions
      })),
      invites: invites.map(l => ({ id: l.id, email: l.email, createdAt: l.created_at, expiresAt: l.expires_at, usedAt: l.used_at, createdBy: l.created_by, status: linkStatus(l) }))
    };
  });

  app.post('/api/admin/invites', async req => {
    const me = admin(req);
    const body = z.object({ email: z.string().trim().max(254).email().transform(normalizeEmail), days: z.number().int().min(1).max(60).default(14) }).parse(req.body);
    if (await db.getUserByEmail(body.email)) throw fail(409, 'This email already has an account.', 'EMAIL_TAKEN');
    const code = await createLink(db, 'invite', body.email, body.days, me.email);
    await audit(me, null, 'admin.invite_created', body.email);
    return { link: linkUrl(config.appUrl, 'invite', code) };
  });

  app.delete('/api/admin/invites/:id', async req => {
    const me = admin(req);
    if (!await db.deleteUnusedLink((req.params as { id: string }).id)) throw fail(404, 'This invite does not exist or has already been used.', 'NOT_FOUND');
    await audit(me, null, 'admin.invite_revoked');
    return { ok: true };
  });

  app.post('/api/admin/users/:id/reset-link', async req => {
    const me = admin(req);
    const user = await target(req);
    if (user.disabled_at) throw fail(409, 'Enable the account before sending a reset link.', 'ACCOUNT_DISABLED');
    const code = await createLink(db, 'reset', user.email, undefined, me.email);
    await audit(me, user, 'admin.reset_link_created');
    return { link: linkUrl(config.appUrl, 'reset', code) };
  });

  app.post('/api/admin/users/:id/logout', async req => {
    const me = admin(req);
    const user = await target(req);
    await db.deleteUserSessions(user.id);
    await audit(me, user, 'admin.sessions_closed');
    return { ok: true };
  });

  app.patch('/api/admin/users/:id', async req => {
    const me = admin(req);
    const user = await target(req);
    const body = z.object({ disabled: z.boolean().optional(), isAdmin: z.boolean().optional() }).parse(req.body);
    if (user.id === me.id) throw fail(400, 'You cannot disable your own account or remove your own admin rights.', 'SELF');
    if (body.disabled !== undefined) {
      await db.setDisabled(user.id, body.disabled);
      await audit(me, user, body.disabled ? 'admin.account_disabled' : 'admin.account_enabled');
    }
    if (body.isAdmin !== undefined) {
      await db.setAdmin(user.id, body.isAdmin);
      await audit(me, user, body.isAdmin ? 'admin.admin_granted' : 'admin.admin_removed');
    }
    return { ok: true };
  });
}
