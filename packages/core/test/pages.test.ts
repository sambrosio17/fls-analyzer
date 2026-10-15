import { describe, expect, it } from 'vitest';
import { effectivePage, unassignedPages, type PageAssignments } from '../src/index.ts';

const a: PageAssignments = {
  orgDefault: 'Org_Page',
  appDefaults: [{ app: 'Sales', page: 'Sales_Page' }],
  assignments: [{ app: 'Sales', profile: 'Admin', recordType: 'Partner', page: 'Partner_Page' }]
};

describe('effectivePage', () => {
  it('prefers app + record type + profile, then app default, then org default', () => {
    expect(effectivePage(a, 'Sales', 'Admin', 'Partner')).toEqual({ page: 'Partner_Page', source: 'app-profile' });
    expect(effectivePage(a, 'Sales', 'Admin', 'Business')).toEqual({ page: 'Sales_Page', source: 'app' });
    expect(effectivePage(a, 'Service', 'Admin', 'Partner')).toEqual({ page: 'Org_Page', source: 'org' });
    expect(effectivePage({ ...a, orgDefault: null }, 'Service', 'Admin', null)).toEqual({ page: null, source: 'system' });
  });

  it('lists pages no assignment uses', () => {
    expect(unassignedPages(a, ['Org_Page', 'Sales_Page', 'Partner_Page', 'Draft'])).toEqual(['Draft']);
  });
});
