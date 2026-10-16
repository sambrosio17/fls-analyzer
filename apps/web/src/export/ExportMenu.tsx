import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n.tsx';
import { dismissExport, runExport, useExportState, type Progress } from './progress.ts';

/** A run that returns a string shows it when the export ends, e.g. to say what was left out. */
export interface ExportItem { id: string; label: string; hint?: string; run: (p: Progress) => void | string | Promise<void | string> }

/** "Export" button with a list of formats; `note` is shown above the list (what will be exported). */
export function ExportMenu({ items, note, disabled }: { items: ExportItem[]; note?: string; disabled?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const running = useExportState()?.status === 'running';
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  useEffect(() => { if (running) setOpen(false); }, [running]);
  return (
    <div className="export" ref={box}>
      <button type="button" className="btn export-btn" disabled={disabled || running} aria-busy={running} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {running ? <><span className="spinner" aria-hidden="true" />{t.export.preparing}</> : t.export.button}<span className="caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="export-menu" role="menu">
          {note && <p className="export-note">{note}</p>}
          {items.map(i => (
            <button key={i.id} type="button" role="menuitem" disabled={running} onClick={() => { setOpen(false); void runExport(i.label, i.run); }}>
              <span>{i.label}</span>{i.hint && <small>{i.hint}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Small exports finish before this, so they never flash the panel. */
const SHOW_AFTER = 300;
const HIDE_DONE_AFTER = 4000;

/** Panel at the right edge with the progress of the running export; it stays open on a note or an error. */
export function ExportProgress() {
  const t = useT();
  const s = useExportState();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!s) { setShown(false); return; }
    if (s.status === 'running') {
      const wait = SHOW_AFTER - (performance.now() - s.startedAt);
      if (wait <= 0) { setShown(true); return; }
      const id = setTimeout(() => setShown(true), wait);
      return () => clearTimeout(id);
    }
    // A quick export with nothing to say needs no panel: the download is the feedback.
    if (s.message || s.status === 'error') setShown(true);
    if (s.status === 'done' && !s.message) {
      const id = setTimeout(dismissExport, HIDE_DONE_AFTER);
      return () => clearTimeout(id);
    }
  }, [s]);
  if (!s || !shown) return null;
  const pct = Math.round(s.fraction * 100);
  const title = s.status === 'running' ? t.export.generating(s.label) : s.status === 'done' ? t.export.ready(s.label) : t.export.failed(s.label);
  return (
    <div className={`export-toast ${s.status}`} role="status" aria-live="polite">
      <div className="export-toast-h">
        <strong>{title}</strong>
        {s.status !== 'running' && <button type="button" className="export-toast-x" aria-label={t.common.close} onClick={dismissExport}>×</button>}
      </div>
      {s.status === 'running' && <>
        {/* At 0% it is usually waiting on Salesforce: show movement rather than a still bar. */}
        <div className={`export-bar${pct ? '' : ' wait'}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct || undefined}><span style={pct ? { width: `${pct}%` } : undefined} /></div>
        <div className="export-toast-sub"><span>{t.export.stage[s.stage]}</span>{pct > 0 && <span>{pct}%</span>}</div>
        <p className="export-toast-sub">{t.export.keepOpen}</p>
      </>}
      {s.message && <p className={s.status === 'error' ? 'err-text' : 'warn-text'}>{s.message}</p>}
    </div>
  );
}
