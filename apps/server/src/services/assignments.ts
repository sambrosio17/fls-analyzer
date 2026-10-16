import { applyPageChanges, assignmentKey, layoutAssignmentsFor, type AssignmentChange } from '@fls/core';
import type { MetadataSaveResult, SfApi } from '../salesforce/client.ts';
import { currentLayouts, currentPages, layoutFullNames } from '../salesforce/pages.ts';

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
export async function writeAssignments(api: SfApi, changes: AssignmentChange[]): Promise<WriteOutcome[]> {
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
      const results = await api.updateMetadata('Profile', records);
      groups.forEach((g, i) => settle(g, results[i]));
    } catch (err) {
      failAll([...byProfile.values()].flat(), err);
    }
  }

  // Lightning pages: one app at a time, so each save starts from the app as it is now.
  const pages = changes.filter(c => c.kind === 'page');
  for (const app of unique(pages.map(c => c.app!))) {
    const group = pages.filter(c => c.app === app);
    try {
      const [record] = await api.readMetadata('CustomApplication', [app]);
      if (!record) { settle(group, { fullName: app, success: false, errors: [{ statusCode: 'NOT_FOUND', message: `The app ${app} no longer exists.` }] }); continue; }
      const updated = applyPageChanges(record, group) as typeof record;
      const [res] = await api.updateMetadata('CustomApplication', [updated]);
      settle(group, res);
    } catch (err) {
      failAll(group, err);
    }
  }
  return out;
}
