export type Access = 0 | 1 | 2;
export type BulkAction = 'read' | 'edit' | 'removeEdit' | 'none';
export type Status = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'running' | 'done' | 'partial' | 'failed';

/** `label` is the alias chosen by the user, or the Salesforce org name when there is none. */
export interface Org { id: string; label: string; alias: string | null; name: string; username: string; instanceUrl: string; isSandbox: boolean; lastSyncAt: string | null }
export interface SObject { name: string; label: string; custom: boolean }
export interface FieldMeta { object: string; name: string; label: string; type: string; permissionable: boolean; calculated: boolean; custom: boolean; encrypted: boolean; hiddenFromUser?: boolean }
export interface PermSet { id: string; name: string; label: string; isProfile: boolean; namespace: string | null; license: string | null; type: string | null }
export interface Matrix {
  fields: FieldMeta[];
  permissionSets: PermSet[];
  /** Per permission set id, one char per field in `fields` order: '0' none, '1' read, '2' edit. Missing = no access. */
  access: Record<string, string>;
  objectRead: { parentId: string; sobjectType: string }[];
}
export interface ChangeItem {
  id: number; parentId: string; parentLabel: string; field: string; sobjectType: string; before: Access; after: Access;
  op: 'insert' | 'update' | 'delete'; warnings: string[]; status: 'pending' | 'ok' | 'error' | 'conflict'; errorCode: string | null; errorMessage: string | null;
}
export interface ChangeSet {
  id: string; number: string; org: Org; author: string; description: string; status: Status; rollbackOf: string | null;
  createdAt: string; submittedAt: string | null; approvedBy: string | null; approvedAt: string | null; startedAt: string | null; finishedAt: string | null;
  requiresApproval: boolean; skipped: { parentId: string; field: string; reason: string }[]; items: ChangeItem[]; conflicts?: number;
}
export interface ChangeSetSummary { id: string; number: string; orgId: string; author: string; description: string; status: Status; createdAt: string; finishedAt: string | null; total: number; ok: number; errors: number }

export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  session: () => call<{ authenticated: boolean; user: string | null }>('GET', '/api/session'),
  login: (password: string) => call<{ authenticated: boolean }>('POST', '/api/session', { password }),
  logout: () => call('DELETE', '/api/session'),
  orgs: () => call<Org[]>('GET', '/api/orgs'),
  removeOrg: (id: string) => call('DELETE', `/api/orgs/${id}`),
  renameOrg: (id: string, alias: string) => call<Org>('PATCH', `/api/orgs/${id}`, { alias }),
  objects: (orgId: string) => call<SObject[]>('GET', `/api/orgs/${orgId}/objects`),
  matrix: (orgId: string, objects: string[]) => call<Matrix>('GET', `/api/orgs/${orgId}/matrix?objects=${encodeURIComponent(objects.join(','))}`),
  createChangeSet: (orgId: string, body: { description?: string; changes?: { parentId: string; field: string; access: Access }[] }) =>
    call<ChangeSet>('POST', `/api/orgs/${orgId}/change-sets`, body),
  changeSet: (id: string) => call<ChangeSet>('GET', `/api/change-sets/${id}`),
  changeSets: (orgId?: string) => call<ChangeSetSummary[]>('GET', `/api/change-sets${orgId ? `?orgId=${orgId}` : ''}`),
  submit: (id: string) => call<ChangeSet>('POST', `/api/change-sets/${id}/submit`),
  approve: (id: string) => call<ChangeSet>('POST', `/api/change-sets/${id}/approve`),
  reject: (id: string) => call<ChangeSet>('POST', `/api/change-sets/${id}/reject`),
  execute: (id: string, confirmName?: string) => call<ChangeSet>('POST', `/api/change-sets/${id}/execute`, { confirmName }),
  rollback: (id: string) => call<ChangeSet>('POST', `/api/change-sets/${id}/rollback`)
};

export const ACCESS_SHORT = ['—', 'L', 'L+M'] as const;
export const ACCESS_LONG = ['Nessun accesso', 'Lettura', 'Lettura e modifica'] as const;
export const STATUS_LABEL: Record<Status, string> = {
  draft: 'Bozza', pending_approval: 'In attesa di approvazione', approved: 'Approvato', rejected: 'Rifiutato',
  running: 'In esecuzione', done: 'Completato', partial: 'Parziale', failed: 'Fallito'
};
export const WARNING_LABEL: Record<string, string> = {
  CALCULATED_READ_ONLY: 'Campo calcolato: applicata solo la lettura.',
  NO_OBJECT_ACCESS: "Manca la lettura sull'oggetto: il campo resterà invisibile."
};
export const SKIP_LABEL: Record<string, string> = {
  NOT_PERMISSIONABLE: 'Campi senza FLS',
  MANAGED_PERMISSION_SET: 'Permission set di pacchetti gestiti',
  GROUP_PERMISSION_SET: 'Permission set group o muting',
  UNKNOWN_FIELD: 'Campi non trovati',
  UNKNOWN_PERMISSION_SET: 'Profili o permission set non trovati',
  NO_CHANGE: 'Già con il valore richiesto'
};
