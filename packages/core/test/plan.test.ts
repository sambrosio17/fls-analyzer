import { describe, expect, it } from 'vitest';
import { EDIT, NONE, READ, expandBulk, findConflicts, planChanges, rollbackDesired, FlsSnapshot } from '../src/index.ts';
import { fields, permissionSets, snapshot } from './fixtures.ts';

const plan = (desired: Parameters<typeof planChanges>[0]['desired'], snap = snapshot()) =>
  planChanges({ snapshot: snap, fields, permissionSets, desired });

describe('planChanges', () => {
  it('maps missing record to insert, changed access to update and none to delete', () => {
    const { items } = plan([
      { parentId: 'PS_FIN', field: 'Account.Tax_Code__c', access: READ },
      { parentId: 'PS_SALES', field: 'Account.Industry', access: EDIT },
      { parentId: 'PS_SALES', field: 'Account.Tax_Code__c', access: NONE }
    ]);
    expect(items.map(i => [i.parentId, i.field, i.op, i.before, i.after, i.recordId])).toEqual([
      ['PS_FIN', 'Account.Tax_Code__c', 'insert', NONE, READ, null],
      ['PS_SALES', 'Account.Industry', 'update', READ, EDIT, '01k1'],
      ['PS_SALES', 'Account.Tax_Code__c', 'delete', EDIT, NONE, '01k2']
    ]);
  });

  it('caps calculated fields to read and warns', () => {
    const { items } = plan([{ parentId: 'PS_FIN', field: 'Account.Credit_Score__c', access: EDIT }]);
    expect(items[0]).toMatchObject({ op: 'insert', after: READ, warnings: ['CALCULATED_READ_ONLY'] });
  });

  it('skips fields without FLS, managed and group permission sets, unknown ids and no-ops', () => {
    const { items, skipped } = plan([
      { parentId: 'PS_SALES', field: 'Account.Name', access: READ },
      { parentId: 'PS_CPQ', field: 'Account.Industry', access: READ },
      { parentId: 'PS_GROUP', field: 'Account.Industry', access: READ },
      { parentId: 'PS_NOPE', field: 'Account.Industry', access: READ },
      { parentId: 'PS_SALES', field: 'Account.Nope__c', access: READ },
      { parentId: 'PS_SALES', field: 'Account.Industry', access: READ }
    ]);
    expect(items).toEqual([]);
    expect(skipped.map(s => s.reason)).toEqual([
      'NOT_PERMISSIONABLE', 'MANAGED_PERMISSION_SET', 'GROUP_PERMISSION_SET',
      'UNKNOWN_PERMISSION_SET', 'UNKNOWN_FIELD', 'NO_CHANGE'
    ]);
  });

  it('warns when the permission set cannot read the object', () => {
    const { items } = plan([{ parentId: 'PS_FIN', field: 'Case.Priority', access: READ }]);
    expect(items[0]?.warnings).toEqual(['NO_OBJECT_ACCESS']);
  });

  it('keeps the last request for the same cell', () => {
    const { items } = plan([
      { parentId: 'PS_FIN', field: 'Account.Tax_Code__c', access: EDIT },
      { parentId: 'PS_FIN', field: 'Account.Tax_Code__c', access: READ }
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.after).toBe(READ);
  });
});

describe('expandBulk', () => {
  it('removeEdit downgrades only cells that can edit', () => {
    const d = expandBulk(['Account.Industry', 'Account.Tax_Code__c'], ['PS_SALES', 'PS_FIN'], 'removeEdit', snapshot());
    expect(d.map(x => `${x.parentId}:${x.field}:${x.access}`)).toEqual([
      'PS_SALES:Account.Industry:1', 'PS_FIN:Account.Industry:1',
      'PS_SALES:Account.Tax_Code__c:1', 'PS_FIN:Account.Tax_Code__c:0'
    ]);
    const { items } = plan(d);
    expect(items.map(i => `${i.parentId}:${i.field}:${i.op}`)).toEqual(['PS_FIN:Account.Industry:update', 'PS_SALES:Account.Tax_Code__c:update']);
  });
});

describe('rollback and conflicts', () => {
  it('rollback restores previous access when planned on the new state', () => {
    const forward = plan([
      { parentId: 'PS_FIN', field: 'Account.Tax_Code__c', access: READ },
      { parentId: 'PS_SALES', field: 'Account.Tax_Code__c', access: NONE }
    ]);
    const after = new FlsSnapshot(
      [
        { id: '01k1', parentId: 'PS_SALES', sobjectType: 'Account', field: 'Account.Industry', read: true, edit: false },
        { id: '01k9', parentId: 'PS_FIN', sobjectType: 'Account', field: 'Account.Tax_Code__c', read: true, edit: false }
      ],
      [{ parentId: 'PS_SALES', sobjectType: 'Account', read: true }, { parentId: 'PS_FIN', sobjectType: 'Account', read: true }]
    );
    const back = plan(rollbackDesired(forward.items), after);
    expect(back.items.map(i => `${i.parentId}:${i.op}:${i.after}:${i.recordId}`)).toEqual(['PS_FIN:delete:0:01k9', 'PS_SALES:insert:2:null']);
  });

  it('finds items whose state changed after planning', () => {
    const { items } = plan([{ parentId: 'PS_SALES', field: 'Account.Industry', access: EDIT }]);
    const changed = new FlsSnapshot([{ id: '01k1', parentId: 'PS_SALES', sobjectType: 'Account', field: 'Account.Industry', read: true, edit: true }]);
    expect(findConflicts(items, changed)).toHaveLength(1);
    expect(findConflicts(items, snapshot())).toHaveLength(0);
  });
});
