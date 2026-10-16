import { describe, expect, it } from 'vitest';
import { forEachCell, inRange, menuPosition, rangeSize } from '../src/cellRange.ts';

describe('cell range', () => {
  it('covers the rectangle whichever way it was dragged', () => {
    const r = { r0: 3, c0: 2, r1: 1, c1: 0 };
    expect(rangeSize(r)).toBe(9);
    expect(inRange(r, 2, 1)).toBe(true);
    expect(inRange(r, 0, 1)).toBe(false);
    expect(inRange(null, 0, 0)).toBe(false);
  });

  it('maps positions to field and column indexes', () => {
    const cells: string[] = [];
    forEachCell({ r0: 0, c0: 1, r1: 1, c1: 2 }, [7, 9, 11], [4, 5, 6], (i, j) => cells.push(`${i}:${j}`));
    expect(cells).toEqual(['7:5', '7:6', '9:5', '9:6']);
  });

  it('keeps the menu inside the viewport', () => {
    expect(menuPosition(990, 790, 200, 240, 1000, 800)).toEqual({ left: 792, top: 552 });
    expect(menuPosition(100, 100, 200, 240, 1000, 800)).toEqual({ left: 100, top: 100 });
  });
});
