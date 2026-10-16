import { describe, expect, it } from 'vitest';
import { CHANGELOG } from '../src/changelog.ts';
import { GUIDE_IDS } from '../src/pages/Guide.tsx';
import { LANGS } from '../src/i18n.tsx';

describe('changelog', () => {
  it('is newest first, in every language, and links only to guide sections that exist', () => {
    expect(CHANGELOG.map(e => e.date)).toEqual([...CHANGELOG.map(e => e.date)].sort().reverse());
    for (const e of CHANGELOG) {
      for (const { code } of LANGS) expect(e.text[code].title && e.text[code].body, `${e.prs} ${code}`).toBeTruthy();
      if (e.guide) expect(GUIDE_IDS, `${e.prs}`).toContain(e.guide);
    }
  });
});
