/**
 * Work tabs on three levels: open orgs, then the tool inside the active org, then the objects (or change sets)
 * open in that tool. Each object tab is one page with its own objects, filters and pending changes.
 */

export type Tool = 'matrix' | 'layouts' | 'changeset';
export type LayoutMode = 'layouts' | 'pages';

export const TOOLS: Tool[] = ['matrix', 'layouts', 'changeset'];
export const TOOL_LABEL: Record<Tool, string> = { matrix: 'Matrice FLS', layouts: 'Layout e pagine', changeset: 'Change set' };

export interface WorkTab {
  id: string;
  orgId: string;
  tool: Tool;
  /** Empty while the tab still shows the object picker. */
  objects: string[];
  layoutMode?: LayoutMode;
  changeSetId?: string;
  /** Change set number, shown as the tab title. */
  label?: string;
}

export interface Workspace {
  /** Open orgs, in tab order. */
  orgs: string[];
  activeOrg: string | null;
  /** Active tool per org. */
  tool: Record<string, Tool>;
  /** Active object tab per org and tool, keyed `${orgId}|${tool}`. */
  tab: Record<string, string>;
  tabs: WorkTab[];
}

export const EMPTY: Workspace = { orgs: [], activeOrg: null, tool: {}, tab: {}, tabs: [] };

let seq = 0;
export const newTabId = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;
const key = (orgId: string, tool: Tool) => `${orgId}|${tool}`;
const without = <V>(r: Record<string, V>, k: string) => { const { [k]: _, ...rest } = r; return rest; };

export const toolOf = (ws: Workspace, orgId: string): Tool => ws.tool[orgId] ?? 'matrix';
export const groupTabs = (ws: Workspace, orgId: string, tool: Tool) => ws.tabs.filter(t => t.orgId === orgId && t.tool === tool);

/** The object tab on screen: the active one of the active tool of the active org. */
export function visibleTab(ws: Workspace): WorkTab | null {
  if (!ws.activeOrg) return null;
  const id = ws.tab[key(ws.activeOrg, toolOf(ws, ws.activeOrg))];
  return ws.tabs.find(t => t.id === id) ?? null;
}

export function tabTitle(tab: WorkTab): string {
  if (tab.tool === 'changeset') return tab.label ?? 'Change set';
  return tab.objects.length ? tab.objects.join(', ') : 'Nuovo oggetto';
}

/** Adds an object tab after the active one of its group and makes it active. */
function addTab(ws: Workspace, tab: Omit<WorkTab, 'id'>): Workspace {
  const t: WorkTab = { ...tab, id: newTabId() };
  const k = key(t.orgId, t.tool);
  const at = ws.tabs.findIndex(x => x.id === ws.tab[k]);
  const tabs = at < 0 ? [...ws.tabs, t] : [...ws.tabs.slice(0, at + 1), t, ...ws.tabs.slice(at + 1)];
  return { ...ws, tabs, tab: { ...ws.tab, [k]: t.id } };
}

/** Matrix and layouts always have a tab to show, so an empty tool opens on the object picker. */
function ensureTab(ws: Workspace, orgId: string, tool: Tool): Workspace {
  if (tool === 'changeset' || groupTabs(ws, orgId, tool).length) return ws;
  return addTab(ws, { orgId, tool, objects: [] });
}

export function openOrg(ws: Workspace, orgId: string): Workspace {
  const next = ws.orgs.includes(orgId) ? ws : { ...ws, orgs: [...ws.orgs, orgId] };
  return ensureTab({ ...next, activeOrg: orgId }, orgId, toolOf(next, orgId));
}

export function selectTool(ws: Workspace, orgId: string, tool: Tool): Workspace {
  return ensureTab({ ...ws, activeOrg: orgId, tool: { ...ws.tool, [orgId]: tool } }, orgId, tool);
}

export function selectTab(ws: Workspace, id: string): Workspace {
  const t = ws.tabs.find(x => x.id === id);
  if (!t) return ws;
  return { ...ws, activeOrg: t.orgId, tool: { ...ws.tool, [t.orgId]: t.tool }, tab: { ...ws.tab, [key(t.orgId, t.tool)]: t.id } };
}

export function newObjectTab(ws: Workspace, orgId: string, tool: Exclude<Tool, 'changeset'>): Workspace {
  return addTab({ ...ws, activeOrg: orgId, tool: { ...ws.tool, [orgId]: tool } }, { orgId, tool, objects: [] });
}

export function openChangeSet(ws: Workspace, orgId: string, changeSetId: string, label?: string): Workspace {
  const opened = openOrg(ws, orgId);
  const existing = opened.tabs.find(t => t.tool === 'changeset' && t.changeSetId === changeSetId);
  if (existing) return selectTab(opened, existing.id);
  return addTab({ ...opened, tool: { ...opened.tool, [orgId]: 'changeset' } }, { orgId, tool: 'changeset', objects: [], changeSetId, label });
}

export function updateTab(ws: Workspace, id: string, patch: Partial<Omit<WorkTab, 'id' | 'orgId' | 'tool'>>): Workspace {
  return { ...ws, tabs: ws.tabs.map(t => t.id === id ? { ...t, ...patch } : t) };
}

/** Closes an object tab; when it was active, its right neighbour in the group (or else the left one) takes over. */
export function closeTab(ws: Workspace, id: string): Workspace {
  const t = ws.tabs.find(x => x.id === id);
  if (!t) return ws;
  const k = key(t.orgId, t.tool);
  const group = groupTabs(ws, t.orgId, t.tool);
  const tabs = ws.tabs.filter(x => x.id !== id);
  if (ws.tab[k] !== id) return { ...ws, tabs };
  const at = group.findIndex(x => x.id === id);
  const next = group[at + 1] ?? group[at - 1];
  return { ...ws, tabs, tab: next ? { ...ws.tab, [k]: next.id } : without(ws.tab, k) };
}

/** Closes an org with all its tabs; the org on its right (or else on its left) becomes active. */
export function closeOrg(ws: Workspace, orgId: string): Workspace {
  const at = ws.orgs.indexOf(orgId);
  if (at < 0) return ws;
  const orgs = ws.orgs.filter(o => o !== orgId);
  const tab = Object.fromEntries(Object.entries(ws.tab).filter(([k]) => !k.startsWith(`${orgId}|`)));
  const activeOrg = ws.activeOrg !== orgId ? ws.activeOrg : orgs[at] ?? orgs[at - 1] ?? null;
  return { orgs, activeOrg, tool: without(ws.tool, orgId), tab, tabs: ws.tabs.filter(t => t.orgId !== orgId) };
}

/** Drops orgs that are no longer connected. */
export function pruneOrgs(ws: Workspace, orgIds: string[]): Workspace {
  const keep = new Set(orgIds);
  return ws.orgs.filter(o => !keep.has(o)).reduce(closeOrg, ws);
}

const STORAGE_KEY = 'orgsmith.workspace';

export function loadWorkspace(storage: Pick<Storage, 'getItem'> | null): Workspace {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (!saved || !Array.isArray(saved.tabs)) return EMPTY;
    const tabs = (saved.tabs as Partial<WorkTab>[])
      .filter((t): t is WorkTab => typeof t?.id === 'string' && typeof t.orgId === 'string' && TOOLS.includes(t.tool as Tool))
      .map(t => ({ ...t, objects: Array.isArray(t.objects) ? t.objects : [] }));
    if (Array.isArray(saved.orgs)) {
      const ws: Workspace = { orgs: saved.orgs, activeOrg: saved.activeOrg ?? null, tool: saved.tool ?? {}, tab: saved.tab ?? {}, tabs };
      return ws.activeOrg && !ws.orgs.includes(ws.activeOrg) ? { ...ws, activeOrg: ws.orgs[0] ?? null } : ws;
    }
    // Single-row tabs from the first version: regroup them by org and tool.
    let ws = EMPTY;
    for (const t of tabs) {
      if (t.tool === 'changeset') { if (t.changeSetId) ws = openChangeSet(ws, t.orgId, t.changeSetId, t.label); continue; }
      ws = selectTool(openOrg(ws, t.orgId), t.orgId, t.tool);
      if (visibleTab(ws)!.objects.length) ws = newObjectTab(ws, t.orgId, t.tool);
      ws = updateTab(ws, visibleTab(ws)!.id, { objects: t.objects, layoutMode: t.layoutMode });
    }
    return ws;
  } catch { /* storage unavailable or corrupt: start empty */ }
  return EMPTY;
}

export function saveWorkspace(storage: Pick<Storage, 'setItem'> | null, ws: Workspace) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(ws)); } catch { /* best effort */ }
}
