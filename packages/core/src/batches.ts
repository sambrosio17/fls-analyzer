import { EDIT, NONE, type ChangeItem, type Operation } from './types.ts';

export const MAX_RECORDS_PER_CALL = 200;

export interface CollectionRequest {
  op: Operation;
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  items: ChangeItem[];
}

/** sObject Collections save result for one record. */
export interface SaveResult {
  id?: string | null;
  success: boolean;
  errors?: { statusCode: string; message: string; fields?: string[] }[];
}

export interface ItemResult {
  item: ChangeItem;
  ok: boolean;
  recordId: string | null;
  errorCode?: string;
  errorMessage?: string;
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Builds sObject Collections calls (max 200 records each, allOrNone false). */
export function buildRequests(items: ChangeItem[], apiVersion: string): CollectionRequest[] {
  const base = `/services/data/${apiVersion}/composite/sobjects`;
  const by = (op: Operation) => items.filter(i => i.op === op);
  const requests: CollectionRequest[] = [];

  for (const group of chunk(by('insert'), MAX_RECORDS_PER_CALL)) {
    requests.push({
      op: 'insert', method: 'POST', path: base, items: group,
      body: {
        allOrNone: false,
        records: group.map(i => ({
          attributes: { type: 'FieldPermissions' },
          ParentId: i.parentId, SobjectType: i.sobjectType, Field: i.field,
          PermissionsRead: i.after !== NONE, PermissionsEdit: i.after === EDIT
        }))
      }
    });
  }
  for (const group of chunk(by('update'), MAX_RECORDS_PER_CALL)) {
    requests.push({
      op: 'update', method: 'PATCH', path: base, items: group,
      body: {
        allOrNone: false,
        records: group.map(i => ({
          attributes: { type: 'FieldPermissions' },
          Id: i.recordId, PermissionsRead: i.after !== NONE, PermissionsEdit: i.after === EDIT
        }))
      }
    });
  }
  for (const group of chunk(by('delete'), MAX_RECORDS_PER_CALL)) {
    const ids = group.map(i => i.recordId).join(',');
    requests.push({ op: 'delete', method: 'DELETE', path: `${base}?ids=${ids}&allOrNone=false`, items: group });
  }
  return requests;
}

/** Pairs each item of a request with its save result (Salesforce keeps the order). */
export function parseResults(request: CollectionRequest, results: SaveResult[]): ItemResult[] {
  return request.items.map((item, idx) => {
    const r = results[idx];
    if (!r) return { item, ok: false, recordId: item.recordId, errorCode: 'MISSING_RESULT', errorMessage: 'Salesforce did not return a result for this record.' };
    if (r.success) return { item, ok: true, recordId: request.op === 'delete' ? null : (r.id ?? item.recordId) };
    const e = r.errors?.[0];
    return { item, ok: false, recordId: item.recordId, errorCode: e?.statusCode ?? 'UNKNOWN_ERROR', errorMessage: e?.message ?? 'Unknown error' };
  });
}
