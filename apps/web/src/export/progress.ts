import { useSyncExternalStore } from 'react';

export type Stage = 'collect' | 'write' | 'compress';

/** Says how far a step is (0..1). Awaiting it lets the browser repaint now and then, so a big export doesn't freeze the page. */
export type Progress = (fraction: number, stage?: Stage) => Promise<void>;

export const noProgress: Progress = async () => {};

/** Maps a sub-step's 0..1 onto [from, to] of the parent. */
export const part = (p: Progress, from: number, to: number, stage?: Stage): Progress =>
  (f, s) => p(from + (to - from) * Math.min(1, Math.max(0, f)), s ?? stage);

/** map() that reports progress every `every` items. */
export async function mapWithProgress<T, R>(items: readonly T[], fn: (item: T, i: number) => R, p: Progress, every = 200): Promise<R[]> {
  const out: R[] = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    if (i % every === 0) await p(i / items.length);
    out[i] = fn(items[i]!, i);
  }
  await p(1);
  return out;
}

export interface ExportState {
  label: string;
  status: 'running' | 'done' | 'error';
  fraction: number;
  stage: Stage;
  startedAt: number;
  /** What was left out, or the error. */
  message?: string;
}

let state: ExportState | null = null;
const listeners = new Set<() => void>();
const set = (s: ExportState | null) => { state = s; listeners.forEach(l => l()); };

export const useExportState = () => useSyncExternalStore(
  l => { listeners.add(l); return () => { listeners.delete(l); }; },
  () => state
);

export const getExportState = () => state;

export const dismissExport = () => { if (state?.status !== 'running') set(null); };

/**
 * Runs one export at a time: while one runs, another call does nothing.
 * `fn` may return a note (e.g. what was left out) to show when it ends.
 */
export async function runExport(label: string, fn: (p: Progress) => void | string | Promise<void | string>): Promise<void> {
  if (state?.status === 'running') return;
  set({ label, status: 'running', fraction: 0, stage: 'collect', startedAt: performance.now() });
  let lastYield = performance.now();
  const report: Progress = async (fraction, stage) => {
    if (!state) return;
    state = { ...state, fraction, stage: stage ?? state.stage };
    if (performance.now() - lastYield > 40) {
      listeners.forEach(l => l());
      await new Promise(r => setTimeout(r, 0));
      lastYield = performance.now();
    }
  };
  // Let the button switch to its busy state before any work starts.
  await new Promise(r => setTimeout(r, 0));
  try {
    const message = await fn(report);
    set({ ...state!, status: 'done', fraction: 1, message: message || undefined });
  } catch (e) {
    set({ ...state!, status: 'error', message: (e as Error).message });
  }
}
