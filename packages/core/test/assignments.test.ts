import { describe, expect, it } from 'vitest';
import {
  applyPageChanges, assignmentConflicts, layoutAssignmentsFor, normalizeAssignments, reverseAssignments, setInOrder, type AssignmentChange
} from '../src/index.ts';

const change = (p: Partial<AssignmentChange>): AssignmentChange => ({
  kind: 'page', object: 'Account', profile: 'Admin', profileLabel: 'System Administrator', recordType: 'Partner', app: 'Sales', before: null, after: 'P1', ...p
});

describe('assignment changes', () => {
  it('keeps the last change per assignment, with the first before, and drops no-ops', () => {
    const r = normalizeAssignments([
      change({ before: 'A', after: 'B' }), change({ before: 'B', after: 'C' }),
      change({ profile: 'Sales', before: 'A', after: 'B' }), change({ profile: 'Sales', before: 'B', after: 'A' })
    ]);
    expect(r).toEqual([change({ before: 'A', after: 'C' })]);
  });

  it('reverses and finds conflicts', () => {
    const c = change({ before: 'A', after: 'B' });
    expect(reverseAssignments([c])).toEqual([{ ...c, before: 'B', after: 'A' }]);
    expect(assignmentConflicts([c], () => 'A')).toEqual([]);
    expect(assignmentConflicts([c], () => 'X')).toEqual([c]);
  });
});

describe('applyPageChanges', () => {
  const app = {
    fullName: 'Sales', actionOverrides: [{ actionName: 'View' }], label: 'Sales',
    profileActionOverrides: [
      { actionName: 'View', content: 'Old', formFactor: 'Large', pageOrSobjectType: 'Account', recordType: 'Account.Partner', type: 'Flexipage', profile: 'Admin' },
      { actionName: 'View', content: 'Phone', formFactor: 'Small', pageOrSobjectType: 'Account', recordType: 'Account.Partner', type: 'Flexipage', profile: 'Admin' }
    ],
    tabs: ['standard-Account'], uiType: 'Lightning'
  };

  it('replaces, adds and removes desktop overrides and leaves phone ones alone', () => {
    const r = applyPageChanges(app, [
      { object: 'Account', profile: 'Admin', recordType: 'Partner', after: 'New' },
      { object: 'Account', profile: 'Sales', recordType: null, after: 'Master_Page' }
    ]);
    expect(r.profileActionOverrides).toEqual([
      app.profileActionOverrides[1],
      { actionName: 'View', content: 'New', formFactor: 'Large', pageOrSobjectType: 'Account', recordType: 'Account.Partner', type: 'Flexipage', profile: 'Admin' },
      { actionName: 'View', content: 'Master_Page', formFactor: 'Large', pageOrSobjectType: 'Account', type: 'Flexipage', profile: 'Sales' }
    ]);
    const removed = applyPageChanges(app, [{ object: 'Account', profile: 'Admin', recordType: 'Partner', after: null }]);
    expect(removed.profileActionOverrides).toEqual([app.profileActionOverrides[1]]);
    expect(app.profileActionOverrides[0]!.content).toBe('Old');
  });

  it('adds the override list in Metadata API order when the app has none', () => {
    const { profileActionOverrides: _, ...bare } = app;
    const r = applyPageChanges(bare, [{ object: 'Account', profile: 'Admin', recordType: null, after: 'P' }]);
    expect(Object.keys(r)).toEqual(['fullName', 'actionOverrides', 'label', 'profileActionOverrides', 'tabs', 'uiType']);
    expect(Object.keys(setInOrder({ a: 1 }, 'b', 2, ['z']))).toEqual(['a', 'b']);
  });
});

describe('layoutAssignmentsFor', () => {
  it('builds profile layout assignments with record types', () => {
    expect(layoutAssignmentsFor([
      { object: 'Account', recordType: 'Partner', after: 'Partner Layout' },
      { object: 'Account', recordType: null, after: 'Account Layout' }
    ], (o, l) => `${o}-${l}`)).toEqual([
      { layout: 'Account-Partner Layout', recordType: 'Account.Partner' },
      { layout: 'Account-Account Layout' }
    ]);
  });
});
