export type LoginEnv = 'production' | 'sandbox' | 'custom';

const MY_DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.(my\.salesforce\.com|salesforce\.com|force\.com)$/i;

export function loginUrlFor(env: LoginEnv, domain?: string): string {
  if (env === 'production') return 'https://login.salesforce.com';
  if (env === 'sandbox') return 'https://test.salesforce.com';
  const host = (domain ?? '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!MY_DOMAIN.test(host)) throw new Error('My Domain must look like acme.my.salesforce.com.');
  return `https://${host}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  instance_url: string;
  /** Identity URL: https://login.salesforce.com/id/<orgId>/<userId> */
  id: string;
}

export interface OAuthSettings {
  clientId: string;
  clientSecret: string | null;
  redirectUri: string;
}

export function authorizeUrl(loginUrl: string, s: OAuthSettings, state: string, codeChallenge: string): string {
  const q = new URLSearchParams({
    response_type: 'code', client_id: s.clientId, redirect_uri: s.redirectUri,
    scope: 'api refresh_token id', state, code_challenge: codeChallenge, code_challenge_method: 'S256', prompt: 'login consent'
  });
  return `${loginUrl}/services/oauth2/authorize?${q}`;
}

async function tokenRequest(loginUrl: string, params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(params)
  });
  const body = await res.json().catch(() => ({})) as Record<string, string>;
  if (!res.ok) throw new Error(`Salesforce OAuth error: ${body.error ?? res.status} ${body.error_description ?? ''}`.trim());
  return body as unknown as TokenResponse;
}

export function exchangeCode(loginUrl: string, s: OAuthSettings, code: string, verifier: string): Promise<TokenResponse> {
  return tokenRequest(loginUrl, {
    grant_type: 'authorization_code', code, client_id: s.clientId, redirect_uri: s.redirectUri, code_verifier: verifier,
    ...(s.clientSecret ? { client_secret: s.clientSecret } : {})
  });
}

export function refreshAccessToken(loginUrl: string, s: OAuthSettings, refreshToken: string): Promise<TokenResponse> {
  return tokenRequest(loginUrl, {
    grant_type: 'refresh_token', refresh_token: refreshToken, client_id: s.clientId,
    ...(s.clientSecret ? { client_secret: s.clientSecret } : {})
  });
}
