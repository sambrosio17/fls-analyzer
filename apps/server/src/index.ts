import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { TokenCipher } from './crypto.ts';
import { Db } from './db.ts';
import type { MemoryOrg } from './salesforce/memoryOrg.ts';
import { DEMO_INSTANCE_URL, demoOrg } from './salesforce/demo.ts';

const config = loadConfig();
const db = await Db.open({ path: config.dbPath, databaseUrl: config.databaseUrl });

// Demo mode: every workspace gets its own in-memory demo org, so one user's changes don't show up for another.
const demos = new Map<string, MemoryOrg>();
const demoFor = (tenant: string) => {
  let demo = demos.get(tenant);
  if (!demo) demos.set(tenant, demo = demoOrg(process.env.DEMO_LARGE === 'true'));
  return demo;
};

const app = buildApp({
  config, db,
  extraApi: org => org.instance_url === DEMO_INSTANCE_URL ? demoFor(org.tenant_id) : undefined,
  prepareTenant: async tenant => {
    if (!config.demoMode) return;
    await db.upsertOrg({
      id: `demo-${tenant}`, tenant_id: tenant, sf_org_id: '00DDEMO', name: demoFor(tenant).data.name, username: 'demo@example.com',
      instance_url: DEMO_INSTANCE_URL, login_url: DEMO_INSTANCE_URL, is_sandbox: 1,
      refresh_token_enc: new TokenCipher(config.appSecret).encrypt('demo'), access_token_enc: null, alias: null
    });
  }
});
await app.listen({ port: config.port, host: config.host });
