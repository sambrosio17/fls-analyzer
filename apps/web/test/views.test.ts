import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEWS, parseViews } from '../src/views.ts';

describe('parseViews', () => {
  it('keeps known views and falls back to the defaults', () => {
    expect(parseViews(null)).toEqual(DEFAULT_VIEWS);
    expect(parseViews('{"matrix":"dense","layouts":"board"}')).toEqual({ matrix: 'dense', layouts: 'board' });
    expect(parseViews('{"matrix":"spreadsheet","layouts":"paint"}')).toEqual({ matrix: 'grid', layouts: 'paint' });
    expect(parseViews('not json')).toEqual(DEFAULT_VIEWS);
  });
});
