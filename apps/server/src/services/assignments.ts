import { applyPageChanges, assignmentKey, layoutAssignmentsFor, profileKey, type AssignmentChange } from '@fls/core';
import type { MetadataRecord, MetadataSaveResult, SfApi } from '../salesforce/client.ts';
import { currentLayouts, currentPages, layoutFullNames, loadRecordTypes } from '../salesforce/pages.ts';

const unique = <T>(xs: T[]) => [...new Set(xs)];

/** Reads what the org assigns now for every change: returns the current layout or page (null: no page assignment). */
export async function loadCurrentAssignments(api: SfApi, changes: AssignmentChange[]): Promise<(c: AssignmentChange) => string | null> {
  const layoutObjects = unique(changes.filter(c => c.kind === 'layout').map(c => c.object));
  const pageChanges = changes.filter(c => c.kind === 'page');
  const [layouts, pages] = await Promise.all([
    Promise.all(layoutObjects.map(async o => [o, await currentLayouts(api, o)] as const)).then(e => new Map(e)),
    pageChanges.length ? currentPages(api, pageChanges) : Promise.resolve(new Map<string, string>())
  ]);
  return c => c.kind === 'layout'
    ? layouts.get(c.object)?.get(`${c.profile}|${c.recordType ?? ''}`) ?? null
    : pages.get(assignmentKey(c)) ?? null;
}

export interface WriteOutcome { change: AssignmentChange; ok: boolean; errorCode?: string; errorMessage?: string }

/**
 * Writes assignment changes with the Metadata API: layouts as profile layoutAssignments (one Profile
 * record per profile), pages by reading each Lightning app, changing its profile overrides and
 * saving the whole app. A failed record fails every change it carries.
 */
export async function writeAssignments(api: SfApi, changes: AssignmentChange[], timings = new Timings()): Promise<WriteOutcome[]> {
  const out: WriteOutcome[] = [];
  const settle = (group: AssignmentChange[], res: MetadataSaveResult | undefined) => {
    for (const change of group) {
      if (res?.success) out.push({ change, ok: true });
      else out.push({ change, ok: false, errorCode: res?.errors[0]?.statusCode ?? 'NO_RESULT', errorMessage: res?.errors.map(e => e.message).join('; ') || 'Salesforce returned no result.' });
    }
  };
  const failAll = (group: AssignmentChange[], err: unknown) => {
    for (const change of group) out.push({ change, ok: false, errorCode: 'REQUEST_FAILED', errorMessage: String(err) });
  };

  // Layouts: a profile must always have one, so a removal is not possible.
  const layouts = changes.filter(c => c.kind === 'layout');
  for (const c of layouts.filter(c => !c.after)) out.push({ change: c, ok: false, errorCode: 'LAYOUT_REQUIRED', errorMessage: 'Every profile needs a page layout.' });
  const byProfile = new Map<string, AssignmentChange[]>();
  for (const c of layouts.filter(c => c.after)) byProfile.set(c.profile, [...byProfile.get(c.profile) ?? [], c]);
  if (byProfile.size) {
    try {
      const fullNames = new Map(await Promise.all(unique(layouts.map(c => c.object)).map(async o => [o, await layoutFullNames(api, o)] as const)));
      const groups = [...byProfile.values()];
      const records = groups.map(g => ({
        fullName: g[0]!.profile,
        layoutAssignments: layoutAssignmentsFor(g, (o, l) => fullNames.get(o)?.get(l) ?? `${o}-${l}`)
      }));
      const results = await timings.time('save profiles', () => api.updateMetadata('Profile', records));
      groups.forEach((g, i) => settle(g, results[i]));
    } catch (err) {
      failAll([...byProfile.values()].flat(), err);
    }
  }

  // Lightning pages: one app at a time, so each save starts from the app as it is now.
  const pages = changes.filter(c => c.kind === 'page');
  if (pages.length) out.push(...await writePages(api, pages, timings));
  return out;
}

/** Times the steps of a run, for the change set result ("why is it slow?"). */
export class Timings {
  readonly steps: { step: string; ms: number }[] = [];
  async time<T>(step: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try { return await fn(); } finally { this.steps.push({ step, ms: Math.round(performance.now() - start) }); }
  }
}

const fail = (change: AssignmentChange, errorCode: string, errorMessage: string): WriteOutcome => ({ change, ok: false, errorCode, errorMessage });

/**
 * Lightning page assignments, per app. Changes naming a profile, page or record type the org does not
 * have are refused before writing. Then the app is saved once with all its changes; if Salesforce
 * refuses it, the app is saved unchanged to see whether the app itself is the problem, and otherwise the
 * changes are split in halves until the refused ones are found, so the others still go through.
 */
export async function writePages(api: SfApi, changes: AssignmentChange[], timings = new Timings()): Promise<WriteOutcome[]> {
  const out: WriteOutcome[] = [];
  const objects = unique(changes.map(c => c.object));
  const [profiles, pageNames, recordTypes] = await timings.time('check', () => Promise.all([
    api.listMetadata('Profile').then(r => new Set(r.map(p => profileKey(p.fullName)))),
    api.tooling<{ DeveloperName: string; NamespacePrefix: string | null }>(`SELECT DeveloperName, NamespacePrefix FROM FlexiPage WHERE Type = 'RecordPage'`)
      .then(r => new Set(r.map(p => p.NamespacePrefix ? `${p.NamespacePrefix}__${p.DeveloperName}` : p.DeveloperName))),
    Promise.all(objects.map(async o => [o, new Set((await loadRecordTypes(api, o)).map(r => r.developerName))] as const)).then(e => new Map(e))
  ]));
  const valid: AssignmentChange[] = [];
  for (const c of changes) {
    if (!profiles.has(profileKey(c.profile))) out.push(fail(c, 'UNKNOWN_PROFILE', `The org has no profile named ${c.profile}.`));
    else if (c.after && !pageNames.has(c.after)) out.push(fail(c, 'UNKNOWN_PAGE', `The org has no Lightning record page named ${c.after}.`));
    else if (!recordTypes.get(c.object)?.has(c.recordType)) out.push(fail(c, 'UNKNOWN_RECORD_TYPE', `${c.object} has no record type ${c.recordType}.`));
    else valid.push(c);
  }

  for (const app of unique(valid.map(c => c.app!))) {
    const group = valid.filter(c => c.app === app);
    const save = async (part: AssignmentChange[], profileName?: (p: string) => string): Promise<MetadataSaveResult | { error: string }> => {
      try {
        const [record] = await timings.time('read app', () => api.readMetadata('CustomApplication', [app]));
        if (!record) return { fullName: app, success: false, errors: [{ statusCode: 'NOT_FOUND', message: `The app ${app} no longer exists.` }] };
        const updated = applyPageChanges(record, part, profileName) as MetadataRecord;
        const [res] = await timings.time('save app', () => api.updateMetadata('CustomApplication', [updated]));
        return res ?? { fullName: app, success: false, errors: [{ statusCode: 'NO_RESULT', message: 'Salesforce returned no result.' }] };
      } catch (err) { return { error: String(err) }; }
    };
    const settle = (part: AssignmentChange[], res: MetadataSaveResult | { error: string }, note = '') => {
      for (const c of part) {
        if ('error' in res) out.push(fail(c, 'REQUEST_FAILED', res.error));
        else if (res.success) out.push({ change: c, ok: true });
        else out.push(fail(c, res.errors[0]?.statusCode ?? 'ERROR', `${res.errors.map(e => e.message).join('; ')}${note}`));
      }
    };
    const refused = (r: MetadataSaveResult | { error: string }) => !('error' in r) && !r.success;

    const first = await save(group);
    if (!refused(first)) { settle(group, first); continue; }
    // Is it the app as stored? Saving it unchanged tells.
    const asIs = await save([]);
    if (refused(asIs)) { settle(group, first, ' (Salesforce also refuses to save this app unchanged, so the problem is in the app, not in these assignments.)'); continue; }
    // Find the refused changes by halves; a single refused change is retried with the profile name in its other form.
    const find = async (part: AssignmentChange[]): Promise<void> => {
      const res = await save(part);
      if (!refused(res)) return settle(part, res);
      if (part.length > 1) {
        const mid = Math.ceil(part.length / 2);
        await find(part.slice(0, mid));
        await find(part.slice(mid));
        return;
      }
      const c = part[0]!;
      const other = profileKey(c.profile) === c.profile ? null : profileKey(c.profile);
      if (other) {
        const retry = await save(part, () => other);
        if (!refused(retry)) return settle(part, retry);
      }
      settle(part, res);
    };
    const mid = Math.ceil(group.length / 2);
    if (group.length > 1) { await find(group.slice(0, mid)); await find(group.slice(mid)); }
    else await find(group);
  }
  return out;
}
