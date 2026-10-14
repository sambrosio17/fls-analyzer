import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { TransitionError } from '@fls/core';
import type { Config } from './config.ts';
import { pkcePair, randomToken, safeEqual, TokenCipher } from './crypto.ts';
import { DEFAULT_TENANT, Db, type OrgRow } from './db.ts';
import { SalesforceClient, SalesforceError, type SfApi } from './salesforce/client.ts';
import { listObjects, loadFields, loadOrgInfo, loadPermissionSets, loadSnapshot, loadUserPermissions } from './salesforce/metadata.ts';
import { authorizeUrl, exchangeCode, loginUrlFor, refreshAccessToken, type OAuthSettings } from './salesforce/oauth.ts';
import { ChangeSetService, NotFoundError } from './services/changesets.ts';

const SESSION = 'fls_session';
const OAUTH = 'fls_oauth';

export interface AppOptions {
  config: Config;
  db: Db;
  /** Overrides the Salesforce client (tests). */
  apiFor?: (org: OrgRow) => SfApi;
}

const desiredSchema = z.object({ parentId: z.string(), field: z.string(), access: z.union([z.literal(0), z.literal(1), z.literal(2)]) });
const createSchema = z.object({
  description: z.string().max(500).optional(),
  changes: z.array(desiredSchema).max(20000).optional(),
  bulk: z.array(z.object({ fields: z.array(z.string()).min(1), parentIds: z.array(z.string()).min(1), action: z.enum(['read', 'edit', 'removeEdit', 'none']) })).max(50).optional()
});

export function orgDto(o: OrgRow) {
  return { id: o.id, name: o.name, username: o.username, instanceUrl: o.instance_url, isSandbox: !!o.is_sandbox, lastSyncAt: o.last_sync_at };
}

export function buildApp({ config, db, apiFor: apiOverride }: AppOptions) {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? (process.env.VITEST ? 'silent' : 'info') } });
  const cipher = new TokenCipher(config.appSecret);
  const tenant = DEFAULT_TENANT;
  const oauth: OAuthSettings = { clientId: config.sfClientId, clientSecret: config.sfClientSecret, redirectUri: `${config.appUrl}/oauth/callback` };
  const secure = config.appUrl.startsWith('https://');

  const apiFor = apiOverride ?? ((org: OrgRow) => new SalesforceClient({
    instanceUrl: org.instance_url,
    apiVersion: config.sfApiVersion,
    accessToken: org.access_token_enc ? cipher.decrypt(org.access_token_enc) : null,
    refresh: async () => {
      const t = await refreshAccessToken(org.login_url, oauth, cipher.decrypt(org.refresh_token_enc));
      db.setAccessToken(org.id, cipher.encrypt(t.access_token));
      return t.access_token;
    }
  }));
  const service = new ChangeSetService({ db, tenant, actor: config.appUser, requireDifferentApprover: config.requireDifferentApprover, apiFor });

  app.register(cookie, { secret: config.appSecret });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
    if (err instanceof TransitionError) return reply.code(409).send({ error: err.message });
    if (err instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid request', issues: err.issues });
    if (err instanceof SalesforceError) return reply.code(502).send({ error: err.message, salesforce: err.body });
    app.log.error(err);
    return reply.code((err as { statusCode?: number }).statusCode ?? 500).send({ error: (err as Error).message });
  });

  const authed = (req: FastifyRequest) => {
    const raw = req.cookies[SESSION];
    return !!raw && req.unsignCookie(raw).valid;
  };
  app.addHook('onRequest', async (req, reply) => {
    const path = req.url.split('?')[0]!;
    const open = path === '/api/session' || !(path.startsWith('/api/') || path.startsWith('/oauth/'));
    if (!open && !authed(req)) return reply.code(401).send({ error: 'Login required' });
  });

  // ---- app session (single user in the MVP)
  app.get('/api/session', async req => ({ authenticated: authed(req), user: authed(req) ? config.appUser : null }));
  app.post('/api/session', async (req, reply) => {
    const { password } = z.object({ password: z.string() }).parse(req.body);
    if (!safeEqual(password, config.appPassword)) return reply.code(401).send({ error: 'Wrong password' });
    db.audit({ tenant, actor: config.appUser, action: 'session.login' });
    reply.setCookie(SESSION, randomToken(), { signed: true, httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 60 * 60 * 12 });
    return { authenticated: true, user: config.appUser };
  });
  app.delete('/api/session', async (_req, reply) => {
    reply.clearCookie(SESSION, { path: '/' });
    return { authenticated: false };
  });

  // ---- Salesforce OAuth (web server flow + PKCE)
  app.get('/oauth/start', async (req, reply) => {
    const q = z.object({ env: z.enum(['production', 'sandbox', 'custom']), domain: z.string().optional() }).parse(req.query);
    const loginUrl = loginUrlFor(q.env, q.domain);
    const state = randomToken();
    const { verifier, challenge } = pkcePair();
    reply.setCookie(OAUTH, JSON.stringify({ state, verifier, loginUrl }), { signed: true, httpOnly: true, sameSite: 'lax', secure, path: '/oauth', maxAge: 600 });
    return reply.redirect(authorizeUrl(loginUrl, oauth, state, challenge));
  });

  app.get('/oauth/callback', async (req, reply) => {
    const q = z.object({ code: z.string().optional(), state: z.string().optional(), error: z.string().optional(), error_description: z.string().optional() }).parse(req.query);
    const fail = (msg: string) => reply.redirect(`/?oauthError=${encodeURIComponent(msg)}`);
    if (q.error) return fail(q.error_description ?? q.error);
    const raw = req.cookies[OAUTH];
    const unsigned = raw ? req.unsignCookie(raw) : null;
    if (!unsigned?.valid || !unsigned.value) return fail('Login session expired, try again.');
    const saved = JSON.parse(unsigned.value) as { state: string; verifier: string; loginUrl: string };
    reply.clearCookie(OAUTH, { path: '/oauth' });
    if (!q.code || q.state !== saved.state) return fail('Invalid OAuth state.');

    const token = await exchangeCode(saved.loginUrl, oauth, q.code, saved.verifier);
    if (!token.refresh_token) return fail('Salesforce did not return a refresh token: add the refresh_token scope to the app.');
    const tmp = new SalesforceClient({ instanceUrl: token.instance_url, apiVersion: config.sfApiVersion, accessToken: token.access_token, refresh: async () => token.access_token });
    const [info, identity] = await Promise.all([
      loadOrgInfo(tmp),
      fetch(token.id, { headers: { Authorization: `Bearer ${token.access_token}` } }).then(r => r.json() as Promise<{ username: string }>)
    ]);
    const org = db.upsertOrg({
      id: randomToken(12), tenant_id: tenant, sf_org_id: info.orgId, name: info.name, username: identity.username,
      instance_url: token.instance_url, login_url: saved.loginUrl, is_sandbox: info.isSandbox ? 1 : 0,
      refresh_token_enc: cipher.encrypt(token.refresh_token), access_token_enc: cipher.encrypt(token.access_token)
    });
    db.audit({ tenant, orgId: org.id, actor: config.appUser, action: 'org.connected', detail: `${info.name} (${identity.username})` });
    return reply.redirect(`/?org=${org.id}`);
  });

  // ---- orgs and metadata
  const orgOr404 = (id: string) => {
    const org = db.getOrg(tenant, id);
    if (!org) throw new NotFoundError('Org not found.');
    return org;
  };

  app.get('/api/orgs', async () => db.listOrgs(tenant).map(orgDto));
  app.delete('/api/orgs/:id', async req => {
    const { id } = req.params as { id: string };
    db.deleteOrg(tenant, orgOr404(id).id);
    db.audit({ tenant, orgId: id, actor: config.appUser, action: 'org.removed' });
    return { ok: true };
  });
  app.get('/api/orgs/:id/status', async req => {
    const api = apiFor(orgOr404((req.params as { id: string }).id));
    return { permissions: await loadUserPermissions(api) };
  });
  app.get('/api/orgs/:id/objects', async req => listObjects(apiFor(orgOr404((req.params as { id: string }).id))));
  app.get('/api/orgs/:id/permission-sets', async req => loadPermissionSets(apiFor(orgOr404((req.params as { id: string }).id))));

  app.get('/api/orgs/:id/matrix', async req => {
    const org = orgOr404((req.params as { id: string }).id);
    const { objects } = z.object({ objects: z.string().min(1) }).parse(req.query);
    const list = [...new Set(objects.split(',').map(s => s.trim()).filter(Boolean))].slice(0, 20);
    const api = apiFor(org);
    const [fields, permissionSets] = await Promise.all([loadFields(api, list), loadPermissionSets(api)]);
    const { fieldPerms, objectPerms } = await loadSnapshot(api, list, permissionSets.map(p => p.id));
    db.touchOrg(org.id);
    return {
      fields, permissionSets,
      cells: fieldPerms.filter(r => r.read || r.edit).map(r => ({ parentId: r.parentId, field: r.field, access: r.edit ? 2 : 1 })),
      objectRead: objectPerms.filter(o => o.read).map(o => ({ parentId: o.parentId, sobjectType: o.sobjectType }))
    };
  });

  // ---- change sets
  const csDto = (id: string) => {
    const cs = db.getChangeSet(tenant, id);
    if (!cs) throw new NotFoundError('Change set not found.');
    const org = orgOr404(cs.org_id);
    return {
      id: cs.id, number: `CS-${String(cs.seq).padStart(4, '0')}`, org: orgDto(org), author: cs.author, description: cs.description,
      status: cs.status, rollbackOf: cs.rollback_of, createdAt: cs.created_at, submittedAt: cs.submitted_at,
      approvedBy: cs.approved_by, approvedAt: cs.approved_at, startedAt: cs.started_at, finishedAt: cs.finished_at,
      requiresApproval: !org.is_sandbox, skipped: JSON.parse(cs.skipped_json),
      items: db.listItems(cs.id).map(r => ({
        id: r.id, parentId: r.parent_id, parentLabel: r.parent_label, field: r.field, sobjectType: r.sobject_type,
        before: r.before_access, after: r.after_access, op: r.op, warnings: r.warnings ? r.warnings.split(',') : [],
        status: r.status, errorCode: r.error_code, errorMessage: r.error_message
      }))
    };
  };

  app.get('/api/change-sets', async req => {
    const { orgId } = z.object({ orgId: z.string().optional() }).parse(req.query);
    return db.listChangeSets(tenant, orgId).map(cs => ({
      id: cs.id, number: `CS-${String(cs.seq).padStart(4, '0')}`, orgId: cs.org_id, author: cs.author, description: cs.description,
      status: cs.status, createdAt: cs.created_at, finishedAt: cs.finished_at, total: cs.total, ok: cs.ok ?? 0, errors: cs.errors ?? 0
    }));
  });
  app.post('/api/orgs/:id/change-sets', async req => {
    const cs = await service.create((req.params as { id: string }).id, createSchema.parse(req.body));
    return csDto(cs.id);
  });
  app.get('/api/change-sets/:id', async req => csDto((req.params as { id: string }).id));
  app.post('/api/change-sets/:id/submit', async req => csDto(service.submit((req.params as { id: string }).id).id));
  app.post('/api/change-sets/:id/reject', async req => csDto(service.reject((req.params as { id: string }).id).id));
  app.post('/api/change-sets/:id/approve', async req => {
    const r = await service.approve((req.params as { id: string }).id);
    return { ...csDto(r.changeSet.id), conflicts: r.conflicts };
  });
  app.post('/api/change-sets/:id/execute', async req => {
    const id = (req.params as { id: string }).id;
    const cs = db.getChangeSet(tenant, id);
    if (!cs) throw new NotFoundError('Change set not found.');
    const org = orgOr404(cs.org_id);
    // Production needs the org name typed back as an extra guard.
    if (!org.is_sandbox) {
      const { confirmName } = z.object({ confirmName: z.string() }).parse(req.body ?? {});
      if (confirmName.trim() !== org.name) throw Object.assign(new Error('The org name does not match.'), { statusCode: 400 });
    }
    service.start(id);
    return csDto(id);
  });
  app.post('/api/change-sets/:id/rollback', async req => csDto((await service.rollback((req.params as { id: string }).id)).id));

  // ---- built web app (production)
  const webDist = fileURLToPath(new URL('../../web/dist', import.meta.url));
  if (existsSync(webDist)) {
    app.register(fastifyStatic, { root: webDist, wildcard: false });
    app.setNotFoundHandler((req, reply: FastifyReply) => {
      if (req.url.startsWith('/api/') || req.url.startsWith('/oauth/')) return reply.code(404).send({ error: 'Not found' });
      return reply.sendFile('index.html');
    });
  }

  return app;
}
