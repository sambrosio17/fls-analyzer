import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { TokenCipher } from './crypto.ts';
import { DEFAULT_TENANT, Db } from './db.ts';
import type { SfApi } from './salesforce/client.ts';
import { DEMO_ORG_ID, demoOrg } from './salesforce/demo.ts';

const config = loadConfig();
const db = new Db(config.dbPath);
const extraApis = new Map<string, SfApi>();

if (config.demoMode) {
  const demo = demoOrg(process.env.DEMO_LARGE === 'true');
  extraApis.set(DEMO_ORG_ID, demo);
  db.upsertOrg({
    id: DEMO_ORG_ID, tenant_id: DEFAULT_TENANT, sf_org_id: '00DDEMO', name: demo.data.name, username: 'demo@example.com',
    instance_url: 'https://demo.invalid', login_url: 'https://demo.invalid', is_sandbox: 1,
    refresh_token_enc: new TokenCipher(config.appSecret).encrypt('demo'), access_token_enc: null, alias: null
  });
}

const app = buildApp({ config, db, extraApis });
await app.listen({ port: config.port, host: '127.0.0.1' });
