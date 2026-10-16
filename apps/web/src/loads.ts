import { createContext, useContext, useSyncExternalStore } from 'react';

/**
 * Slow work started in a tab (loading a matrix, layouts, running a change set) keeps going when the user switches
 * to another tab. While that tab is out of sight, its work shows in a panel at the right edge, like an export, and
 * says when it is done so the user can go back to it.
 */
export type LoadKind = 'load' | 'run';

export interface Load {
  id: number;
  tabId: string;
  kind: LoadKind;
  status: 'running' | 'done' | 'error';
  message?: string;
}

let loads: Load[] = [];
let visible: string | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const set = (next: Load[]) => { loads = next; listeners.forEach(l => l()); };

export const useLoads = () => useSyncExternalStore(
  l => { listeners.add(l); return () => { listeners.delete(l); }; },
  () => loads
);

/** The tab on screen; finished work there needs no notice, the page itself shows it. */
export function setVisibleTab(tabId: string | null) {
  visible = tabId;
  if (tabId && loads.some(l => l.tabId === tabId && l.status !== 'running')) set(loads.filter(l => !(l.tabId === tabId && l.status !== 'running')));
}

export const getLoads = () => loads;

export const dismissLoad = (id: number) => set(loads.filter(l => l.id !== id));

/** Drops what belonged to a closed tab. */
export const forgetTab = (tabId: string) => { if (loads.some(l => l.tabId === tabId)) set(loads.filter(l => l.tabId !== tabId)); };

/** Starts tracking; call the returned function when the work ends (with the error message, if it failed). */
export function beginLoad(tabId: string, kind: LoadKind): (error?: string) => void {
  const id = ++seq;
  // A new load in the same tab replaces the old one: only the latest result is on the page.
  set([...loads.filter(l => l.tabId !== tabId), { id, tabId, kind, status: 'running' }]);
  return error => {
    if (!loads.some(l => l.id === id)) return;
    if (visible === tabId) { dismissLoad(id); return; }
    set(loads.map(l => l.id === id ? { ...l, status: error ? 'error' : 'done', message: error } : l));
  };
}

export async function trackLoad<T>(tabId: string | null, kind: LoadKind, work: Promise<T>): Promise<T> {
  if (!tabId) return work;
  const end = beginLoad(tabId, kind);
  try { const r = await work; end(); return r; } catch (e) { end((e as Error).message); throw e; }
}

/** The work tab a page belongs to, so its slow loads can be tracked. */
export const TabContext = createContext<string | null>(null);
export const useTabId = () => useContext(TabContext);
