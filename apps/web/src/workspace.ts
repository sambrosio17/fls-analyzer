/** Work tabs: each one holds an org, a tool and the objects open in it, so several can stay open side by side. */

export type Tool = 'matrix' | 'layouts' | 'changeset';
export type LayoutMode = 'layouts' | 'pages';

export interface WorkTab {
  id: string;
  /** Null until the user picks an org in the new tab. */
  orgId: string | null;
  /** Null until the user picks a tool in the new tab. */
  tool: Tool | null;
  objects: string[];
  layoutMode?: LayoutMode;
  changeSetId?: string;
}

export interface Workspace { tabs: WorkTab[]; active: string | null }

export const TOOL_LABEL: Record<Tool, string> = { matrix: 'Matrice FLS', layouts: 'Layout e pagine', changeset: 'Change set' };

let seq = 0;
export const newTabId = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;

export function openTab(ws: Workspace, tab: Omit<WorkTab, 'id'>, afterId = ws.active): Workspace {
  const t = { ...tab, id: newTabId() };
  const at = ws.tabs.findIndex(x => x.id === afterId);
  const tabs = at < 0 ? [...ws.tabs, t] : [...ws.tabs.slice(0, at + 1), t, ...ws.tabs.slice(at + 1)];
  return { tabs, active: t.id };
}

export function updateTab(ws: Workspace, id: string, patch: Partial<WorkTab>): Workspace {
  return { ...ws, tabs: ws.tabs.map(t => t.id === id ? { ...t, ...patch } : t) };
}

/** Closes a tab; when it was the active one, its right neighbour (or else the left one) becomes active. */
export function closeTab(ws: Workspace, id: string): Workspace {
  const at = ws.tabs.findIndex(t => t.id === id);
  if (at < 0) return ws;
  const tabs = ws.tabs.filter(t => t.id !== id);
  if (ws.active !== id) return { tabs, active: ws.active };
  return { tabs, active: (tabs[at] ?? tabs[at - 1])?.id ?? null };
}

/** Drops tabs of orgs that are no longer connected. */
export function pruneTabs(ws: Workspace, orgIds: string[]): Workspace {
  const keep = new Set(orgIds);
  return ws.tabs.filter(t => t.orgId && !keep.has(t.orgId)).reduce((acc, t) => closeTab(acc, t.id), ws);
}

export function tabTitle(tab: WorkTab, orgLabel: string | null): string[] {
  if (!tab.orgId || !tab.tool) return [orgLabel ?? 'Nuova scheda'];
  const what = tab.tool === 'changeset' ? [] : tab.objects.length ? [tab.objects.join(', ')] : [];
  return [orgLabel ?? '?', TOOL_LABEL[tab.tool], ...what];
}

const KEY = 'orgsmith.workspace';

export function loadWorkspace(storage: Pick<Storage, 'getItem'> | null): Workspace {
  try {
    const raw = storage?.getItem(KEY);
    const ws = raw ? JSON.parse(raw) as Workspace : null;
    if (ws && Array.isArray(ws.tabs)) return { tabs: ws.tabs.filter(t => t && typeof t.id === 'string'), active: ws.active ?? null };
  } catch { /* storage unavailable or corrupt: start empty */ }
  return { tabs: [], active: null };
}

export function saveWorkspace(storage: Pick<Storage, 'setItem'> | null, ws: Workspace) {
  try { storage?.setItem(KEY, JSON.stringify(ws)); } catch { /* best effort */ }
}
