/** A rectangle of matrix cells, by position in the visible field rows and permission set columns. */
export interface CellRange { r0: number; c0: number; r1: number; c1: number }

export const bounds = (r: CellRange) => ({
  top: Math.min(r.r0, r.r1), bottom: Math.max(r.r0, r.r1), left: Math.min(r.c0, r.c1), right: Math.max(r.c0, r.c1)
});

export function inRange(r: CellRange | null, row: number, col: number): boolean {
  if (!r) return false;
  const b = bounds(r);
  return row >= b.top && row <= b.bottom && col >= b.left && col <= b.right;
}

export const rangeSize = (r: CellRange) => { const b = bounds(r); return (b.bottom - b.top + 1) * (b.right - b.left + 1); };

/** Calls `fn` with the field and column index of every cell in the range. */
export function forEachCell(r: CellRange, fields: number[], columns: number[], fn: (i: number, j: number) => void) {
  const b = bounds(r);
  for (let rr = b.top; rr <= b.bottom; rr++) {
    const i = fields[rr];
    if (i === undefined) continue;
    for (let cc = b.left; cc <= b.right; cc++) { const j = columns[cc]; if (j !== undefined) fn(i, j); }
  }
}

/** Places a menu of the given size at the pointer, kept inside the viewport. */
export function menuPosition(x: number, y: number, w: number, h: number, vw: number, vh: number) {
  return { left: Math.max(8, Math.min(x, vw - w - 8)), top: Math.max(8, Math.min(y, vh - h - 8)) };
}
