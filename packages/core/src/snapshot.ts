import { accessOf, NONE, type Access, type FieldPermRecord, type ObjectPermRecord } from './types.ts';

export interface Cell {
  access: Access;
  recordId: string | null;
}

const cellKey = (parentId: string, field: string) => `${parentId}|${field}`;

/** Current FLS state of an org for a set of objects and permission sets. */
export class FlsSnapshot {
  private readonly cells = new Map<string, Cell>();
  private readonly objectRead = new Set<string>();

  constructor(fieldPerms: FieldPermRecord[], objectPerms: ObjectPermRecord[] = []) {
    for (const r of fieldPerms) {
      this.cells.set(cellKey(r.parentId, r.field), { access: accessOf(r.read, r.edit), recordId: r.id });
    }
    for (const o of objectPerms) if (o.read) this.objectRead.add(cellKey(o.parentId, o.sobjectType));
  }

  /** A missing FieldPermissions record means no access. */
  get(parentId: string, field: string): Cell {
    return this.cells.get(cellKey(parentId, field)) ?? { access: NONE, recordId: null };
  }

  hasObjectRead(parentId: string, sobjectType: string): boolean {
    return this.objectRead.has(cellKey(parentId, sobjectType));
  }
}
