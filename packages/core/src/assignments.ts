/** Page layout and Lightning record page assignments, and the pure edits that change them in metadata. */

export type AssignmentKind = 'layout' | 'page';

/**
 * One assignment to change.
 * Layouts: which layout a profile sees for a record type. Pages: which Lightning record page a profile
 * sees for a record type in an app; `null` removes the assignment, so the app or org default applies.
 */
export interface AssignmentChange {
  kind: AssignmentKind;
  object: string;
  /** Profile metadata full name. */
  profile: string;
  profileLabel: string;
  /** Record type developer name (with namespace), null for Master. */
  recordType: string | null;
  /** Lightning app full name; null for layouts. */
  app: string | null;
  before: string | null;
  after: string | null;
}

/** Identifies the assignment a change is about (not its values). */
export const assignmentKey = (c: Pick<AssignmentChange, 'kind' | 'object' | 'app' | 'profile' | 'recordType'>) =>
  [c.kind, c.object, c.app ?? '', c.profile, c.recordType ?? ''].join('|');

/** Keeps the last change per assignment and drops the ones that change nothing. */
export function normalizeAssignments(changes: AssignmentChange[]): AssignmentChange[] {
  const byKey = new Map<string, AssignmentChange>();
  for (const c of changes) {
    const prev = byKey.get(assignmentKey(c));
    byKey.set(assignmentKey(c), prev ? { ...c, before: prev.before } : c);
  }
  return [...byKey.values()].filter(c => c.before !== c.after);
}

/** The changes that undo `changes`. */
export const reverseAssignments = (changes: AssignmentChange[]): AssignmentChange[] =>
  changes.map(c => ({ ...c, before: c.after, after: c.before }));

/** Changes whose `before` no longer matches the org: `current` returns the value the org has now. */
export const assignmentConflicts = (changes: AssignmentChange[], current: (c: AssignmentChange) => string | null) =>
  changes.filter(c => current(c) !== c.before);

type Rec = Record<string, unknown>;
const asList = (v: unknown): Rec[] => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]) as Rec[];

/** Returns a copy of `record` with `key` set, adding it before the first of `before` when it is new (Metadata API element order). */
export function setInOrder(record: Rec, key: string, value: unknown, before: string[]): Rec {
  if (key in record) return { ...record, [key]: value };
  const entries = Object.entries(record);
  const at = entries.findIndex(([k]) => before.includes(k));
  entries.splice(at < 0 ? entries.length : at, 0, [key, value]);
  return Object.fromEntries(entries);
}

/** CustomApplication elements that come after profileActionOverrides. */
const AFTER_PROFILE_OVERRIDES = ['setupExperience', 'subscriberControlledNavItems', 'tabs', 'uiType', 'utilityBar', 'workspaceConfig'];

const isDesktopView = (o: Rec) => o.actionName === 'View' && o.type === 'Flexipage' && (o.formFactor ?? 'Large') === 'Large';

/**
 * Applies page changes to a CustomApplication record read with readMetadata: each change sets,
 * replaces or (page null) removes the desktop record page override for its profile and record type.
 */
export function applyPageChanges(app: Rec, changes: Pick<AssignmentChange, 'object' | 'profile' | 'recordType' | 'after'>[]): Rec {
  let list = asList(app.profileActionOverrides).map(o => ({ ...o }));
  for (const c of changes) {
    const rt = c.recordType ? `${c.object}.${c.recordType}` : undefined;
    const matches = (o: Rec) => isDesktopView(o) && o.pageOrSobjectType === c.object && o.profile === c.profile && (o.recordType || undefined) === rt;
    list = list.filter(o => !matches(o));
    if (c.after) {
      list.push({
        actionName: 'View', content: c.after, formFactor: 'Large', pageOrSobjectType: c.object,
        ...(rt ? { recordType: rt } : {}), type: 'Flexipage', profile: c.profile
      });
    }
  }
  return setInOrder(app, 'profileActionOverrides', list, AFTER_PROFILE_OVERRIDES);
}

/** Profile layoutAssignments for layout changes; `layoutFullName` maps a layout name to its metadata full name. */
export function layoutAssignmentsFor(changes: Pick<AssignmentChange, 'object' | 'recordType' | 'after'>[], layoutFullName: (object: string, layout: string) => string) {
  return changes.filter(c => c.after).map(c => ({
    layout: layoutFullName(c.object, c.after!),
    ...(c.recordType ? { recordType: `${c.object}.${c.recordType}` } : {})
  }));
}
