import { useSyncExternalStore } from 'react';

/**
 * How the permission matrices (FLS and Apex) and the layout assignments are shown. Chosen in Settings,
 * or from the switch at the top of each tool; saved in this browser.
 */
export const MATRIX_VIEWS = ['grid', 'focus', 'dense', 'rules'] as const;
export const LAYOUT_VIEWS = ['table', 'paint', 'board'] as const;
export type MatrixView = typeof MATRIX_VIEWS[number];
export type LayoutView = typeof LAYOUT_VIEWS[number];
export interface ViewPrefs { matrix: MatrixView; layouts: LayoutView }

export const DEFAULT_VIEWS: ViewPrefs = { matrix: 'grid', layouts: 'table' };
const KEY = 'orgsmith.views';

/** Saved preferences, ignoring unknown values. */
export function parseViews(raw: string | null): ViewPrefs {
  try {
    const v = JSON.parse(raw ?? '{}') as Partial<Record<keyof ViewPrefs, string>>;
    return {
      matrix: (MATRIX_VIEWS as readonly string[]).includes(v.matrix ?? '') ? v.matrix as MatrixView : DEFAULT_VIEWS.matrix,
      layouts: (LAYOUT_VIEWS as readonly string[]).includes(v.layouts ?? '') ? v.layouts as LayoutView : DEFAULT_VIEWS.layouts
    };
  } catch { return { ...DEFAULT_VIEWS }; }
}

const storage = (() => { try { return window.localStorage; } catch { return null; } })();
let current: ViewPrefs = (() => { try { return parseViews(storage?.getItem(KEY) ?? null); } catch { return { ...DEFAULT_VIEWS }; } })();
const listeners = new Set<() => void>();

export function setViews(patch: Partial<ViewPrefs>) {
  current = { ...current, ...patch };
  try { storage?.setItem(KEY, JSON.stringify(current)); } catch { /* best effort */ }
  listeners.forEach(l => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useViews(): [ViewPrefs, (patch: Partial<ViewPrefs>) => void] {
  return [useSyncExternalStore(subscribe, () => current), setViews];
}
