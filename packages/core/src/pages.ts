/** Lightning record page assignments of one object (desktop), as stored in CustomObject and CustomApplication metadata. */
export interface PageAssignments {
  /** Org default page (CustomObject actionOverrides). */
  orgDefault: string | null;
  /** App default pages (CustomApplication actionOverrides). */
  appDefaults: { app: string; page: string }[];
  /** App + record type + profile pages (CustomApplication profileActionOverrides). `profile` is the profile's metadata full name. */
  assignments: { app: string; profile: string; recordType: string | null; page: string }[];
}

/** Where the page a user sees comes from, from most to least specific. */
export type PageSource = 'app-profile' | 'app' | 'org' | 'system';

/**
 * The record page a profile sees for a record type in an app, following Salesforce's precedence:
 * app + record type + profile, then app default, then org default, then the system default page.
 */
export function effectivePage(a: PageAssignments, app: string, profile: string, recordType: string | null): { page: string | null; source: PageSource } {
  const specific = a.assignments.find(x => x.app === app && x.profile === profile && x.recordType === recordType);
  if (specific) return { page: specific.page, source: 'app-profile' };
  const appDefault = a.appDefaults.find(x => x.app === app);
  if (appDefault) return { page: appDefault.page, source: 'app' };
  if (a.orgDefault) return { page: a.orgDefault, source: 'org' };
  return { page: null, source: 'system' };
}

/** Pages that no assignment uses: candidates for clean-up. */
export function unassignedPages(a: PageAssignments, pages: string[]): string[] {
  const used = new Set([a.orgDefault, ...a.appDefaults.map(x => x.page), ...a.assignments.map(x => x.page)]);
  return pages.filter(p => !used.has(p));
}
