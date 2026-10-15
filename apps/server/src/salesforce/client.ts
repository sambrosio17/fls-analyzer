import { XMLParser } from 'fast-xml-parser';

export class SalesforceError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    const first = Array.isArray(body) ? body[0] as { errorCode?: string; message?: string } : undefined;
    super(first ? `${first.errorCode}: ${first.message}` : `Salesforce request failed with HTTP ${status}`);
  }
}

/** A metadata component as returned by readMetadata, converted from XML: values are strings, lists are arrays. */
export type MetadataRecord = Record<string, unknown> & { fullName: string };

/** The subset of the Salesforce REST, Tooling and Metadata APIs the app needs; faked in tests. */
export interface SfApi {
  readonly apiVersion: string;
  query<T>(soql: string): Promise<T[]>;
  /** SOQL on the Tooling API (Layout, ProfileLayout, FlexiPage...). */
  tooling<T>(soql: string): Promise<T[]>;
  request<T>(method: string, path: string, body?: unknown): Promise<T>;
  /** Metadata API listMetadata: the components of one type with their ids. */
  listMetadata(type: string): Promise<{ fullName: string; id: string }[]>;
  /** Metadata API readMetadata; components that do not exist are left out. */
  readMetadata(type: string, fullNames: string[]): Promise<MetadataRecord[]>;
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

  query<T>(soql: string): Promise<T[]> {
    return this.paged<T>(`/services/data/${this.apiVersion}/query?q=${encodeURIComponent(soql)}`);
  }

  tooling<T>(soql: string): Promise<T[]> {
    return this.paged<T>(`/services/data/${this.apiVersion}/tooling/query?q=${encodeURIComponent(soql)}`);
  }

  async listMetadata(type: string): Promise<{ fullName: string; id: string }[]> {
    const body = `<met:listMetadata><met:queries><met:type>${xmlEscape(type)}</met:type></met:queries><met:asOfVersion>${this.apiVersion.slice(1)}</met:asOfVersion></met:listMetadata>`;
    const res = await this.soap(body) as { listMetadataResponse?: { result?: { fullName: string; id: string }[] } };
    return (res.listMetadataResponse?.result ?? []).map(r => ({ fullName: r.fullName, id: r.id }));
  }

  async readMetadata(type: string, fullNames: string[]): Promise<MetadataRecord[]> {
    const out: MetadataRecord[] = [];
    for (let i = 0; i < fullNames.length; i += 10) {
      const names = fullNames.slice(i, i + 10).map(n => `<met:fullNames>${xmlEscape(n)}</met:fullNames>`).join('');
      const res = await this.soap(`<met:readMetadata><met:type>${xmlEscape(type)}</met:type>${names}</met:readMetadata>`) as
        { readMetadataResponse?: { result?: { records?: MetadataRecord[] }[] } };
      // Components that do not exist come back as empty (nil) records.
      for (const r of (res.readMetadataResponse?.result ?? []).flatMap(x => x.records ?? [])) if (r && typeof r === 'object' && r.fullName) out.push(r);
    }
    return out;
  }

  /** Calls the Metadata SOAP API and returns the parsed Body; refreshes the token once on INVALID_SESSION_ID. */
  private async soap(operation: string): Promise<Record<string, unknown>> {
    if (!this.token) this.token = await this.opts.refresh();
    const send = () => fetch(`${this.opts.instanceUrl}/services/Soap/m/${this.apiVersion.slice(1)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=UTF-8', SOAPAction: '""' },
      body: `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">`
        + `<soapenv:Header><met:SessionHeader><met:sessionId>${xmlEscape(this.token!)}</met:sessionId></met:SessionHeader></soapenv:Header>`
        + `<soapenv:Body>${operation}</soapenv:Body></soapenv:Envelope>`
    });
    let res = await send();
    let text = await res.text();
    if (!res.ok && text.includes('INVALID_SESSION_ID')) {
      this.token = await this.opts.refresh();
      res = await send();
      text = await res.text();
    }
    const body = (parseXml(text) as { Envelope?: { Body?: Record<string, unknown> } }).Envelope?.Body ?? {};
    const fault = body.Fault as { faultcode?: string; faultstring?: string } | undefined;
    if (fault || !res.ok) throw new SalesforceError(res.status, [{ errorCode: fault?.faultcode ?? 'SOAP_ERROR', message: fault?.faultstring ?? text.slice(0, 200) }]);
    return body;
  }

  private async paged<T>(first: string): Promise<T[]> {
    const out: T[] = [];
    let next: string | null = first;
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

const xmlEscape = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Metadata elements that are lists even when the response holds a single one. */
const LIST_ELEMENTS = new Set([
  'result', 'records', 'actionOverrides', 'profileActionOverrides', 'flexiPageRegions', 'itemInstances',
  'componentInstanceProperties', 'layoutSections', 'layoutColumns', 'layoutItems', 'fields', 'recordTypes', 'tabs'
]);
const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false, isArray: name => LIST_ELEMENTS.has(name) });
export const parseXml = (xml: string): unknown => parser.parse(xml);
