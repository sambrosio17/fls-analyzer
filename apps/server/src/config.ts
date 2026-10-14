export interface Config {
  port: number;
  appUrl: string;
  appPassword: string;
  appSecret: string;
  /** Name recorded as author/approver in the single-user MVP. */
  appUser: string;
  sfClientId: string;
  sfClientSecret: string | null;
  sfApiVersion: string;
  dbPath: string;
  /** Multi-client phase: approver must differ from the author. */
  requireDifferentApprover: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const missing = ['APP_PASSWORD', 'APP_SECRET', 'SF_CLIENT_ID'].filter(k => !env[k]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}. See .env.example.`);
  if (env.APP_SECRET!.length < 32) throw new Error('APP_SECRET must be at least 32 characters long.');
  return {
    port: Number(env.PORT ?? 3000),
    appUrl: (env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
    appPassword: env.APP_PASSWORD!,
    appSecret: env.APP_SECRET!,
    appUser: env.APP_USER ?? 'owner',
    sfClientId: env.SF_CLIENT_ID!,
    sfClientSecret: env.SF_CLIENT_SECRET || null,
    sfApiVersion: env.SF_API_VERSION ?? 'v62.0',
    dbPath: env.DB_PATH ?? './data/fls-analyzer.db',
    requireDifferentApprover: env.REQUIRE_DIFFERENT_APPROVER === 'true'
  };
}
