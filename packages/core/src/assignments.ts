import { profileKey, type FormFactor } from './pages.ts';

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
  /** Pages only: desktop (Large) or phone (Small); null for layouts. */
  formFactor?: FormFactor | null;
  before: string | null;
  after: string | null;
}

/** Identifies the assignment a change is about (not its values). */
export const assignmentKey = (c: Pick<AssignmentChange, 'kind' | 'object' | 'app' | 'profile' | 'recordType' | 'formFactor'>) =>
  [c.kind, c.object, c.app ?? '', profileKey(c.profile), c.recordType ?? '', c.kind === 'page' ? c.formFactor ?? 'Large' : ''].join('|');

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

const isView = (o: Rec, formFactor: FormFactor) => o.actionName === 'View' && o.type === 'Flexipage' && (o.formFactor || 'Large') === formFactor;

/**
 * How the app already writes this profile in its overrides (plain or encoded), so a new override
 * uses the same form; with no override for it yet, the Metadata API full name.
 */
export function profileAsInApp(list: Rec[], profile: string): string {
  const key = profileKey(profile);
  const seen = list.map(o => o.profile).find(p => typeof p === 'string' && profileKey(p) === key) as string | undefined;
  if (seen) return seen;
  const plainStyle = list.some(o => typeof o.profile === 'string' && /[():]/.test(o.profile));
  return plainStyle ? key : profile;
}

/**
 * Applies page changes to a CustomApplication record read with readMetadata: each change sets,
 * replaces or (page null) removes the record page override for its profile, record type and form factor.
 * `profileName` overrides how a profile is written (default: profileAsInApp).
 */
export function applyPageChanges(app: Rec, changes: Pick<AssignmentChange, 'object' | 'profile' | 'recordType' | 'after' | 'formFactor'>[],
  profileName?: (profile: string) => string): Rec {
  const original = asList(app.profileActionOverrides);
  let list = original.map(o => ({ ...o }));
  for (const c of changes) {
    const rt = c.recordType ? `${c.object}.${c.recordType}` : undefined;
    const ff = c.formFactor ?? 'Large';
    const key = profileKey(c.profile);
    const matches = (o: Rec) => isView(o, ff) && o.pageOrSobjectType === c.object && typeof o.profile === 'string' && profileKey(o.profile) === key && (o.recordType || undefined) === rt;
    list = list.filter(o => !matches(o));
    if (c.after) {
      list.push({
        actionName: 'View', content: c.after, formFactor: ff, pageOrSobjectType: c.object,
        ...(rt ? { recordType: rt } : {}), type: 'Flexipage', profile: profileName?.(c.profile) ?? profileAsInApp(original, c.profile)
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
