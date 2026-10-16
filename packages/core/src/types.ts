/** Field access level: 0 = none, 1 = read, 2 = read + edit. */
export type Access = 0 | 1 | 2;
export const NONE: Access = 0;
export const READ: Access = 1;
export const EDIT: Access = 2;

/**
 * Apex class access rides the same pipeline as FLS: classes are "fields" of this pseudo-object, named
 * `ApexClass.<Name>` (with the namespace prefix for managed classes), and "read" means enabled.
 * In Salesforce they are SetupEntityAccess records instead of FieldPermissions.
 */
export const APEX_CLASS = 'ApexClass';
export const isApex = (sobjectType: string) => sobjectType === APEX_CLASS;

export interface FieldMeta {
  /** Object API name, e.g. "Account". */
  object: string;
  /** Qualified field name as stored in FieldPermissions.Field, e.g. "Account.Industry". */
  name: string;
  label: string;
  type: string;
  /** False for fields that have no FLS (e.g. Account.Name). */
  permissionable: boolean;
  /** Formula, roll-up summary or auto number: can only be read. */
  calculated: boolean;
  custom: boolean;
  encrypted: boolean;
  /** Not visible to the connected user (so missing from describe), found through EntityParticle. */
  hiddenFromUser?: boolean;
  /** Record id of the Apex class, for SetupEntityAccess.SetupEntityId. */
  entityId?: string;
}

export interface PermSetMeta {
  id: string;
  /** API name, or the profile name for profile-owned permission sets. */
  name: string;
  label: string;
  isProfile: boolean;
  namespace: string | null;
  license: string | null;
  /** PermissionSet.Type: Regular, Profile, Group, Muting, Session... */
  type: string | null;
}

/** One FieldPermissions record as read from Salesforce. */
export interface FieldPermRecord {
  id: string;
  parentId: string;
  sobjectType: string;
  field: string;
  read: boolean;
  edit: boolean;
}

export interface ObjectPermRecord {
  parentId: string;
  sobjectType: string;
  read: boolean;
}

export type BulkAction = 'read' | 'edit' | 'removeEdit' | 'none';

/** A requested target state for one (permission set, field) cell. */
export interface Desired {
  parentId: string;
  field: string;
  access: Access;
}

export type Operation = 'insert' | 'update' | 'delete';

export type WarningCode = 'CALCULATED_READ_ONLY' | 'NO_OBJECT_ACCESS';

export type SkipReason =
  | 'UNKNOWN_FIELD'
  | 'UNKNOWN_PERMISSION_SET'
  | 'NOT_PERMISSIONABLE'
  | 'MANAGED_PERMISSION_SET'
  | 'GROUP_PERMISSION_SET'
  | 'NO_CHANGE';

export interface ChangeItem {
  parentId: string;
  field: string;
  sobjectType: string;
  before: Access;
  after: Access;
  /** Id of the existing FieldPermissions record (null when inserting). */
  recordId: string | null;
  op: Operation;
  warnings: WarningCode[];
  /** Apex class id, needed to insert its SetupEntityAccess. */
  entityId?: string;
}

export interface SkippedItem {
  parentId: string;
  field: string;
  reason: SkipReason;
}

export interface Plan {
  items: ChangeItem[];
  skipped: SkippedItem[];
}

export function accessOf(read: boolean, edit: boolean): Access {
  if (edit) return EDIT;
  return read ? READ : NONE;
}

export function objectOf(field: string): string {
  const dot = field.indexOf('.');
  return dot === -1 ? field : field.slice(0, dot);
}
