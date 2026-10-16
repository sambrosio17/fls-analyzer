import type { Access, BulkAction, FieldMeta, PermSet } from '../../api.ts';

/**
 * What every way of showing the permission matrix needs: the data, the filtered rows and columns,
 * and the pending changes. Views change cells through `assign` and call `commit` once to re-render.
 */
export interface MatrixModel {
  apex: boolean;
  allFields: FieldMeta[];
  allPs: PermSet[];
  /** Number of fields; cell index = column * F + field. */
  F: number;
  /** Field and permission set indexes left by the filters, in display order. */
  fields: number[];
  columns: number[];
  base: Uint8Array;
  pending: Map<number, Access>;
  /** Changes on every edit, for memoised views. */
  rev: number;
  cur: (idx: number) => Access;
  /** Read and edit counts per permission set over the visible fields. */
  counts: { read: Int32Array; edit: Int32Array };
  /** Whether the cell can be changed (field with FLS, permission set not from a package, group or muting). */
  editable: (i: number, j: number) => boolean;
  /** Sets a cell if it can be changed; edit on a calculated field becomes read. */
  assign: (i: number, j: number, v: Access) => boolean;
  /** Puts a cell back to a pending value, or to the org's value when `v` is undefined. */
  restore: (idx: number, v: Access | undefined) => void;
  commit: () => void;
}

export const lockedPs = (p: PermSet) => !!p.namespace || p.type === 'Group' || p.type === 'Muting';

/** The value a bulk action gives a cell that has `c` now. */
export const targetFor = (action: BulkAction, c: Access): Access =>
  action === 'read' ? 1 : action === 'edit' ? 2 : action === 'none' ? 0 : c === 2 ? 1 : c;

/** Access levels a cell can take: two for Apex classes and calculated fields, three otherwise. */
export const levelsFor = (apex: boolean, f: FieldMeta): Access[] => apex || f.calculated ? [0, 1] : [0, 1, 2];
