import { describe, expect, it } from 'vitest';
import { buildRequests, parseResults, type ChangeItem } from '../src/index.ts';

const item = (n: number, op: ChangeItem['op']): ChangeItem => ({
  parentId: 'PS1', field: `Account.F${n}__c`, sobjectType: 'Account',
  before: op === 'insert' ? 0 : 1, after: op === 'delete' ? 0 : 2,
  recordId: op === 'insert' ? null : `01k${n}`, op, warnings: []
});

describe('buildRequests', () => {
  it('splits into calls of max 200 records per operation', () => {
    const items = [
      ...Array.from({ length: 450 }, (_, i) => item(i, 'insert')),
      ...Array.from({ length: 3 }, (_, i) => item(1000 + i, 'update')),
      ...Array.from({ length: 2 }, (_, i) => item(2000 + i, 'delete'))
    ];
    const reqs = buildRequests(items, 'v62.0');
    expect(reqs.map(r => [r.method, r.items.length])).toEqual([['POST', 200], ['POST', 200], ['POST', 50], ['PATCH', 3], ['DELETE', 2]]);
    const body0 = reqs[0]?.body as { allOrNone: boolean; records: unknown[] };
    expect(body0.allOrNone).toBe(false);
    expect(body0.records[0]).toEqual({ attributes: { type: 'FieldPermissions' }, ParentId: 'PS1', SobjectType: 'Account', Field: 'Account.F0__c', PermissionsRead: true, PermissionsEdit: true });
    expect((reqs[3]?.body as { records: unknown[] }).records[0]).toEqual({ attributes: { type: 'FieldPermissions' }, Id: '01k1000', PermissionsRead: true, PermissionsEdit: true });
    expect(reqs[4]?.path).toBe('/services/data/v62.0/composite/sobjects?ids=01k2000,01k2001&allOrNone=false');
  });
});

describe('parseResults', () => {
  it('pairs results with items and keeps error details', () => {
    const [req] = buildRequests([item(1, 'insert'), item(2, 'insert')], 'v62.0');
    const res = parseResults(req!, [
      { id: '01kNEW', success: true },
      { success: false, errors: [{ statusCode: 'FIELD_INTEGRITY_EXCEPTION', message: 'Not allowed for this license' }] }
    ]);
    expect(res.map(r => [r.ok, r.recordId, r.errorCode])).toEqual([[true, '01kNEW', undefined], [false, null, 'FIELD_INTEGRITY_EXCEPTION']]);
  });
});
