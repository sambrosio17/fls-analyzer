import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ACCENTS, TransitionError } from '@fls/core';
import type { Config } from './config.ts';
import { registerAccounts, type SessionUser } from './accounts.ts';
import { registerAdmin } from './admin.ts';
import { pkcePair, randomToken, TokenCipher } from './crypto.ts';
import { Db, orgLabel, type OrgRow } from './db.ts';
import { SalesforceClient, SalesforceError, type SfApi } from './salesforce/client.ts';
import { loadLayoutAnalysis, loadPageAnalysis, loadProfiles } from './salesforce/pages.ts';
import { accessStrings, listObjects, loadFields, loadOrgInfo, loadPermissionSets, loadSnapshot, loadUserPermissions } from './salesforce/metadata.ts';
import { authorizeUrl, exchangeCode, loginUrlFor, refreshAccessToken, type OAuthSettings, type TokenResponse } from './salesforce/oauth.ts';
import { ChangeSetService, NotFoundError, type Actor } from './services/changesets.ts';

const OAUTH = 'fls_oauth';

export interface AppOptions {
  config: Config;
  db: Db;
  /** Overrides the Salesforce client (tests). */
  apiFor?: (org: OrgRow) => SfApi;
  /** Fixed clients for some orgs, e.g. the demo org; undefined for a real org. */
  extraApi?: (org: OrgRow) => SfApi | undefined;
  /** Called when a user signs in, e.g. to give their workspace the demo org. */
  prepareTenant?: (tenant: string) => Promise<void>;
  /** Overrides the OAuth refresh-token call (tests). */
  refreshToken?: (loginUrl: string, refreshToken: string) => Promise<TokenResponse>;
}

const desiredSchema = z.object({ parentId: z.string(), field: z.string(), access: z.union([z.literal(0), z.literal(1), z.literal(2)]) });
const createSchema = z.object({
  description: z.string().max(500).optional(),
  changes: z.array(desiredSchema).max(200000).optional(),
  bulk: z.array(z.object({ fields: z.array(z.string()).min(1), parentIds: z.array(z.string()).min(1), action: z.enum(['read', 'edit', 'removeEdit', 'none']) })).max(50).optional()
});

const name = z.string().min(1).max(255);
const assignmentSchema = z.object({
  description: z.string().max(500).optional(),
  changes: z.array(z.object({
    kind: z.enum(['layout', 'page']), object: z.string().regex(/^[A-Za-z0-9_]+$/), profile: name, profileLabel: name,
    recordType: name.nullable(), app: name.nullable(), formFactor: z.enum(['Large', 'Small']).nullable().optional(), before: name.nullable().default(null), after: name.nullable()
  }).refine(c => (c.kind === 'page') === !!c.app, 'Page assignments need an app, layout assignments none.')).min(1).max(5000)
});

const aliasSchema = z.string().trim().min(1).max(40);

export function orgDto(o: OrgRow) {
  return { id: o.id, label: orgLabel(o), alias: o.alias, name: o.name, username: o.username, instanceUrl: o.instance_url, isSandbox: !!o.is_sandbox, lastSyncAt: o.last_sync_at, accent: o.accent ?? null };
}

export function buildApp({ config, db, apiFor: apiOverride, extraApi, prepareTenant, refreshToken }: AppOptions) {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? (process.env.VITEST ? 'silent' : 'info') }, trustProxy: config.trustProxy });
  const cipher = new TokenCipher(config.appSecret);
  const oauth: OAuthSettings = { clientId: config.sfClientId, clientSecret: config.sfClientSecret, redirectUri: `${config.appUrl}/oauth/callback` };
  const secure = config.appUrl.startsWith('https://');
  const refresh = refreshToken ?? ((loginUrl: string, token: string) => refreshAccessToken(loginUrl, oauth, token));
  /** Gets a new access token with the stored refresh token and saves it. */
  const renewToken = async (org: OrgRow) => {
    const t = await refresh(org.login_url, cipher.decrypt(org.refresh_token_enc));
    await db.setAccessToken(org.id, cipher.encrypt(t.access_token));
    return t.access_token;
  };

  const apiFor = apiOverride ?? ((org: OrgRow) => extraApi?.(org) ?? new SalesforceClient({
    instanceUrl: org.instance_url,
    apiVersion: config.sfApiVersion,
    accessToken: org.access_token_enc ? cipher.decrypt(org.access_token_enc) : null,
    refresh: () => renewToken(org)
  }));
  const service = new ChangeSetService({ db, requireDifferentApprover: config.requireDifferentApprover, apiFor });
  // Runs a restart cut short carry on from where they stopped.
  service.resumeInterrupted().catch(err => app.log.error(err));

  app.register(cookie, { secret: config.appSecret });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
    if (err instanceof TransitionError) return reply.code(409).send({ error: err.message });
    if (err instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid request', issues: err.issues });
    if (err instanceof SalesforceError) return reply.code(502).send({ error: err.message, salesforce: err.body });
    app.log.error(err);
    const { statusCode, code } = err as { statusCode?: number; code?: unknown };
    // `code` lets the web app show the message in the user's language.
    return reply.code(statusCode ?? 500).send({ error: (err as Error).message, ...(typeof code === 'string' && /^[A-Z_]+$/.test(code) ? { code } : {}) });
  });

  const accounts = registerAccounts(app, { db, config, prepareTenant });
  const users = new WeakMap<FastifyRequest, SessionUser>();
  /** Tenant and actor of the signed-in user; the onRequest hook guarantees there is one on protected routes. */
  const who = (req: FastifyRequest): Actor & { user: SessionUser } => {
    const user = users.get(req);
    if (!user) throw Object.assign(new Error('Login required'), { statusCode: 401 });
    return { tenant: user.tenant, actor: user.email, user };
  };

  registerAdmin(app, { db, config, who });

  const appOrigin = new URL(config.appUrl).origin;
  const appHost = new URL(config.appUrl).host;
  /** Routes open without a session: log in, sign up, the invite and password reset links. */
  const isPublic = (method: string, path: string) =>
    path === '/api/session' || path === '/api/account/link' || path === '/api/account/reset' || (path === '/api/account' && method === 'POST');
  app.addHook('onRequest', async (req, reply) => {
    const path = req.url.split('?')[0]!;
    // Cookies are per host: opening the app on 127.0.0.1 while the OAuth callback returns to
    // APP_URL (e.g. localhost) would lose the session. Send page loads to the APP_URL host.
    if (req.method === 'GET' && !path.startsWith('/api/') && req.headers.host && req.headers.host !== appHost) {
      return reply.redirect(`${config.appUrl}${req.url}`);
    }
    const guarded = path.startsWith('/api/') || path.startsWith('/oauth/');
    if (!guarded) return;
    // Requests that change something must come from the app's own pages (cookies are SameSite=Lax too).
    const origin = req.headers.origin;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin && origin !== appOrigin) {
      return reply.code(403).send({ error: 'Cross-site request refused.' });
    }
    const user = await accounts.sessionUser(req);
    if (user) users.set(req, user);
    if (user || isPublic(req.method, path)) return;
    if (path.startsWith('/oauth/')) {
      return reply.redirect(`/?oauthError=${encodeURIComponent('App session not found: log in to the app and connect the org again.')}`);
    }
    return reply.code(401).send({ error: 'Login required' });
  });

  app.addHook('onSend', async (req, reply) => {
    securityHeaders(reply, secure);
    const path = req.url.split('?')[0]!;
    if (path.startsWith('/api/') || path.startsWith('/oauth/')) reply.header('Cache-Control', 'no-store');
  });

  // ---- Salesforce OAuth (web server flow + PKCE)
  app.get('/oauth/start', async (req, reply) => {
    const { tenant } = who(req);
    const q = z.object({ env: z.enum(['production', 'sandbox', 'custom']).optional(), domain: z.string().optional(), alias: aliasSchema.optional(), org: z.string().optional() }).parse(req.query);
    // `org` logs in again to an org already connected, on the same login URL and keeping its alias.
    const existing = q.org ? await orgOr404(tenant, q.org) : null;
    if (!existing && !q.env) throw Object.assign(new Error('Missing env'), { statusCode: 400 });
    const loginUrl = existing?.login_url ?? loginUrlFor(q.env!, q.domain);
    const state = randomToken();
    const { verifier, challenge } = pkcePair();
    reply.setCookie(OAUTH, JSON.stringify({ state, verifier, loginUrl, alias: q.alias ?? existing?.alias ?? null }), { signed: true, httpOnly: true, sameSite: 'lax', secure, path: '/oauth', maxAge: 600 });
    return reply.redirect(authorizeUrl(loginUrl, oauth, state, challenge));
  });

  app.get('/oauth/callback', async (req, reply) => {
    const { tenant, actor } = who(req);
    const q = z.object({ code: z.string().optional(), state: z.string().optional(), error: z.string().optional(), error_description: z.string().optional() }).parse(req.query);
    const fail = (msg: string) => reply.redirect(`/?oauthError=${encodeURIComponent(msg)}`);
    if (q.error) return fail(q.error_description ?? q.error);
    const raw = req.cookies[OAUTH];
    const unsigned = raw ? req.unsignCookie(raw) : null;
    if (!unsigned?.valid || !unsigned.value) return fail('Login session expired, try again.');
    const saved = JSON.parse(unsigned.value) as { state: string; verifier: string; loginUrl: string; alias?: string | null };
    reply.clearCookie(OAUTH, { path: '/oauth' });
    if (!q.code || q.state !== saved.state) return fail('Invalid OAuth state.');

    const token = await exchangeCode(saved.loginUrl, oauth, q.code, saved.verifier);
    if (!token.refresh_token) return fail('Salesforce did not return a refresh token: add the refresh_token scope to the app.');
    const tmp = new SalesforceClient({ instanceUrl: token.instance_url, apiVersion: config.sfApiVersion, accessToken: token.access_token, refresh: async () => token.access_token });
    const [info, identity] = await Promise.all([
      loadOrgInfo(tmp),
      fetch(token.id, { headers: { Authorization: `Bearer ${token.access_token}` } }).then(r => r.json() as Promise<{ username: string }>)
    ]);
    const org = await db.upsertOrg({
      id: randomToken(12), tenant_id: tenant, sf_org_id: info.orgId, name: info.name, username: identity.username,
      instance_url: token.instance_url, login_url: saved.loginUrl, is_sandbox: info.isSandbox ? 1 : 0,
      refresh_token_enc: cipher.encrypt(token.refresh_token), access_token_enc: cipher.encrypt(token.access_token), alias: saved.alias ?? null
    });
    await db.audit({ tenant, orgId: org.id, actor, action: 'org.connected', detail: `${info.name} (${identity.username})` });
    return reply.redirect(`/?org=${org.id}`);
  });

  // ---- orgs and metadata
  const orgOr404 = async (tenant: string, id: string) => {
    const org = await db.getOrg(tenant, id);
    if (!org) throw new NotFoundError('Org not found.');
    return org;
  };
  /** The org named in the route, if it belongs to the signed-in user's workspace. */
  const routeOrg = (req: FastifyRequest) => orgOr404(who(req).tenant, (req.params as { id: string }).id);

  app.get('/api/orgs', async req => (await db.listOrgs(who(req).tenant)).map(orgDto));
  app.patch('/api/orgs/:id', async req => {
    const { tenant, actor } = who(req);
    const org = await routeOrg(req);
    const { alias, accent } = z.object({ alias: aliasSchema.optional(), accent: z.enum(ACCENTS).nullable().optional() }).parse(req.body);
    if (alias !== undefined) {
      await db.setAlias(tenant, org.id, alias);
      await db.audit({ tenant, orgId: org.id, actor, action: 'org.renamed', detail: alias });
    }
    if (accent !== undefined) await db.setAccent(tenant, org.id, accent);
    return orgDto(await orgOr404(tenant, org.id));
  });
  app.delete('/api/orgs/:id', async req => {
    const { tenant, actor } = who(req);
    const org = await routeOrg(req);
    await db.deleteOrg(tenant, org.id);
    await db.audit({ tenant, orgId: org.id, actor, action: 'org.removed' });
    return { ok: true };
  });
  app.post('/api/orgs/:id/token', async (req, reply) => {
    const { tenant, actor } = who(req);
    const org = await routeOrg(req);
    if (!extraApi?.(org)) {
      try { await renewToken(org); } catch (e) {
        await db.audit({ tenant, orgId: org.id, actor, action: 'org.token_refresh_failed', detail: (e as Error).message });
        return reply.code(409).send({ error: `Salesforce did not renew the token (${(e as Error).message}). Log in to the org again.`, detail: (e as Error).message, reauth: true });
      }
    }
    await db.audit({ tenant, orgId: org.id, actor, action: 'org.token_refreshed' });
    return { refreshedAt: new Date().toISOString() };
  });
  app.get('/api/orgs/:id/status', async req => ({ permissions: await loadUserPermissions(apiFor(await routeOrg(req))) }));
  app.get('/api/orgs/:id/objects', async req => listObjects(apiFor(await routeOrg(req))));
  app.get('/api/orgs/:id/permission-sets', async req => loadPermissionSets(apiFor(await routeOrg(req))));

  const objectQuery = z.object({ object: z.string().regex(/^[A-Za-z0-9_]+$/) });
  app.get('/api/orgs/:id/layouts', async req => loadLayoutAnalysis(apiFor(await routeOrg(req)), objectQuery.parse(req.query).object));
  // Metadata API names of the profiles, keyed by their profile-owned permission set, for the metadata export.
  app.get('/api/orgs/:id/profile-names', async req => {
    const profiles = await loadProfiles(apiFor(await routeOrg(req)));
    return Object.fromEntries(profiles.filter(p => p.fullName).map(p => [p.permSetId, p.fullName]));
  });
  app.get('/api/orgs/:id/lightning-pages', async req => loadPageAnalysis(apiFor(await routeOrg(req)), objectQuery.parse(req.query).object));

  app.get('/api/orgs/:id/matrix', async req => {
    const org = await routeOrg(req);
    const { objects } = z.object({ objects: z.string().min(1) }).parse(req.query);
    const list = [...new Set(objects.split(',').map(s => s.trim()).filter(Boolean))].slice(0, 20);
    const api = apiFor(org);
    const warnings: string[] = [];
    const [fields, permissionSets] = await Promise.all([loadFields(api, list, msg => { req.log.warn(msg); warnings.push(msg); }), loadPermissionSets(api)]);
    const { fieldPerms, objectPerms } = await loadSnapshot(api, list, permissionSets.map(p => p.id));
    await db.touchOrg(org.id);
    return {
      fields, permissionSets,
      access: accessStrings(fields.map(f => f.name), fieldPerms),
      objectRead: objectPerms.filter(o => o.read).map(o => ({ parentId: o.parentId, sobjectType: o.sobjectType })),
      warnings
    };
  });

  // ---- change sets
  const csDto = async (tenant: string, id: string) => {
    const cs = await db.getChangeSet(tenant, id);
    if (!cs) throw new NotFoundError('Change set not found.');
    const org = await orgOr404(tenant, cs.org_id);
    const [assignments, items] = await Promise.all([db.listAssignments(cs.id), db.listItems(cs.id)]);
    return {
      id: cs.id, number: `CS-${String(cs.seq).padStart(4, '0')}`, org: orgDto(org), author: cs.author, description: cs.description,
      status: cs.status, rollbackOf: cs.rollback_of, createdAt: cs.created_at, submittedAt: cs.submitted_at,
      approvedBy: cs.approved_by, approvedAt: cs.approved_at, startedAt: cs.started_at, finishedAt: cs.finished_at, resumedAt: cs.resumed_at,
      requiresApproval: !org.is_sandbox, skipped: JSON.parse(cs.skipped_json), kind: cs.kind, timings: cs.timings_json ? JSON.parse(cs.timings_json) : null,
      assignments: assignments.map(r => ({
        id: r.id, kind: r.kind, object: r.object, profile: r.profile, profileLabel: r.profile_label, recordType: r.record_type, app: r.app, formFactor: r.form_factor,
        before: r.before_value, after: r.after_value, status: r.status, errorCode: r.error_code, errorMessage: r.error_message
      })),
      items: items.map(r => ({
        id: r.id, parentId: r.parent_id, parentLabel: r.parent_label, field: r.field, sobjectType: r.sobject_type,
        before: r.before_access, after: r.after_access, op: r.op, warnings: r.warnings ? r.warnings.split(',') : [],
        status: r.status, errorCode: r.error_code, errorMessage: r.error_message
      }))
    };
  };
  const csId = (req: FastifyRequest) => (req.params as { id: string }).id;

  app.get('/api/change-sets', async req => {
    const { orgId } = z.object({ orgId: z.string().optional() }).parse(req.query);
    return (await db.listChangeSets(who(req).tenant, orgId)).map(cs => ({
      id: cs.id, number: `CS-${String(cs.seq).padStart(4, '0')}`, orgId: cs.org_id, author: cs.author, description: cs.description,
      status: cs.status, kind: cs.kind, createdAt: cs.created_at, finishedAt: cs.finished_at, total: cs.total, ok: cs.ok, errors: cs.errors
    }));
  });
  app.post('/api/orgs/:id/change-sets', { bodyLimit: 32 * 1024 * 1024 }, async req => {
    const ctx = who(req);
    const cs = await service.create(ctx, csId(req), createSchema.parse(req.body));
    return csDto(ctx.tenant, cs.id);
  });
  app.post('/api/orgs/:id/assignment-change-sets', async req => {
    const ctx = who(req);
    const cs = await service.createAssignments(ctx, csId(req), assignmentSchema.parse(req.body));
    return csDto(ctx.tenant, cs.id);
  });
  app.get('/api/change-sets/:id', async req => csDto(who(req).tenant, csId(req)));
  app.post('/api/change-sets/:id/submit', async req => {
    const ctx = who(req);
    return csDto(ctx.tenant, (await service.submit(ctx, csId(req))).id);
  });
  app.post('/api/change-sets/:id/reject', async req => {
    const ctx = who(req);
    return csDto(ctx.tenant, (await service.reject(ctx, csId(req))).id);
  });
  app.post('/api/change-sets/:id/approve', async req => {
    const ctx = who(req);
    const r = await service.approve(ctx, csId(req));
    return { ...await csDto(ctx.tenant, r.changeSet.id), conflicts: r.conflicts };
  });
  app.post('/api/change-sets/:id/execute', async req => {
    const ctx = who(req);
    const id = csId(req);
    const cs = await db.getChangeSet(ctx.tenant, id);
    if (!cs) throw new NotFoundError('Change set not found.');
    const org = await orgOr404(ctx.tenant, cs.org_id);
    // Production needs the org name (alias if set) typed back as an extra guard.
    if (!org.is_sandbox) {
      const { confirmName } = z.object({ confirmName: z.string() }).parse(req.body ?? {});
      if (confirmName.trim() !== orgLabel(org)) throw Object.assign(new Error('The org name does not match.'), { statusCode: 400 });
    }
    await service.start(ctx, id);
    return csDto(ctx.tenant, id);
  });
  app.post('/api/change-sets/:id/rollback', async req => {
    const ctx = who(req);
    return csDto(ctx.tenant, (await service.rollback(ctx, csId(req))).id);
  });

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

/**
 * Browser protections on every response: no framing (clickjacking), scripts only from the app itself,
 * no MIME sniffing, no referrer (OAuth codes travel in URLs), HTTPS only once served over HTTPS.
 */
export function securityHeaders(reply: FastifyReply, https: boolean): void {
  reply.header('Content-Security-Policy', [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob:", "connect-src 'self'",
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"
  ].join('; '));
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'no-referrer');
  reply.header('Cross-Origin-Opener-Policy', 'same-origin');
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (https) reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
