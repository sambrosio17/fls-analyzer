export class SalesforceError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    const first = Array.isArray(body) ? body[0] as { errorCode?: string; message?: string } : undefined;
    super(first ? `${first.errorCode}: ${first.message}` : `Salesforce request failed with HTTP ${status}`);
  }
}

/** The subset of the Salesforce REST API the app needs; faked in tests. */
export interface SfApi {
  readonly apiVersion: string;
  query<T>(soql: string): Promise<T[]>;
  request<T>(method: string, path: string, body?: unknown): Promise<T>;
}

export interface ClientOptions {
  instanceUrl: string;
  apiVersion: string;
  accessToken: string | null;
  /** Called on a missing or expired token; returns a new access token. */
  refresh: () => Promise<string>;
}

export class SalesforceClient implements SfApi {
  readonly apiVersion: string;
  private token: string | null;

  constructor(private readonly opts: ClientOptions) {
    this.apiVersion = opts.apiVersion;
    this.token = opts.accessToken;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.token) this.token = await this.opts.refresh();
    let res = await this.send(method, path, body);
    if (res.status === 401) {
      this.token = await this.opts.refresh();
      res = await this.send(method, path, body);
    }
    const text = await res.text();
    const parsed: unknown = text ? JSON.parse(text) : null;
    if (!res.ok) throw new SalesforceError(res.status, parsed);
    return parsed as T;
  }

  async query<T>(soql: string): Promise<T[]> {
    const out: T[] = [];
    let next: string | null = `/services/data/${this.apiVersion}/query?q=${encodeURIComponent(soql)}`;
    while (next) {
      const page: { records: T[]; done: boolean; nextRecordsUrl?: string } = await this.request('GET', next);
      out.push(...page.records);
      next = page.done ? null : page.nextRecordsUrl ?? null;
    }
    return out;
  }

  private send(method: string, path: string, body?: unknown) {
    return fetch(`${this.opts.instanceUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  }
}
