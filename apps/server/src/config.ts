export interface Config {
  port: number;
  /** Address the server listens on: 127.0.0.1 for a local install, 0.0.0.0 behind a hosting proxy. */
  host: string;
  appUrl: string;
  appSecret: string;
  sfClientId: string;
  sfClientSecret: string | null;
  sfApiVersion: string;
  /** SQLite file, used when no databaseUrl is set. */
  dbPath: string;
  /** Postgres connection string (hosted); null keeps SQLite. */
  databaseUrl: string | null;
  /** 'invite': new accounts need an invite link; 'open': anyone can sign up. */
  signup: 'invite' | 'open';
  /** Behind a reverse proxy: take the client IP and protocol from X-Forwarded-* headers. */
  trustProxy: boolean;
  /** Approver must differ from the author. */
  requireDifferentApprover: boolean;
  /** Adds an in-memory demo org with sample data to every account; no Salesforce connection needed. */
  demoMode: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const demoMode = env.DEMO_MODE === 'true';
  const missing = ['APP_SECRET', ...(demoMode ? [] : ['SF_CLIENT_ID'])].filter(k => !env[k]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}. See .env.example.`);
  if (env.APP_SECRET!.length < 32) throw new Error('APP_SECRET must be at least 32 characters long.');
  if (env.SIGNUP && !['invite', 'open'].includes(env.SIGNUP)) throw new Error('SIGNUP must be "invite" or "open".');
  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '127.0.0.1',
    appUrl: (env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
    appSecret: env.APP_SECRET!,
    sfClientId: env.SF_CLIENT_ID ?? '',
    sfClientSecret: env.SF_CLIENT_SECRET || null,
    sfApiVersion: env.SF_API_VERSION ?? 'v62.0',
    dbPath: env.DB_PATH ?? './data/fls-analyzer.db',
    databaseUrl: env.DATABASE_URL || null,
    signup: env.SIGNUP === 'open' ? 'open' : 'invite',
    trustProxy: env.TRUST_PROXY === 'true',
    requireDifferentApprover: env.REQUIRE_DIFFERENT_APPROVER === 'true',
    demoMode
  };
}

/** A local install (APP_URL on this machine): its first account can be created without an invite. */
export const isLocal = (appUrl: string) => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(appUrl).hostname);
