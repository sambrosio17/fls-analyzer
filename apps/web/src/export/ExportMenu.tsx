import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n.tsx';

/** A run that returns a string keeps the menu open and shows it, e.g. to say what was left out. */
export interface ExportItem { id: string; label: string; hint?: string; run: () => void | string | Promise<void | string> }

/** "Export" button with a list of formats; `note` is shown above the list (what will be exported). */
export function ExportMenu({ items, note, disabled }: { items: ExportItem[]; note?: string; disabled?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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
  const run = async (item: ExportItem) => {
    setBusy(true); setError(null); setInfo(null);
    try { const msg = await item.run(); if (msg) setInfo(msg); else setOpen(false); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="export" ref={box}>
      <button type="button" className="btn export-btn" disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(!open); setError(null); setInfo(null); }}>
        {busy ? t.export.preparing : t.export.button}<span className="caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="export-menu" role="menu">
          {note && <p className="export-note">{note}</p>}
          {items.map(i => (
            <button key={i.id} type="button" role="menuitem" disabled={busy} onClick={() => run(i)}>
              <span>{i.label}</span>{i.hint && <small>{i.hint}</small>}
            </button>
          ))}
          {info && <p className="export-note warn-text">{info}</p>}
          {error && <p className="export-note err-text">{error}</p>}
        </div>
      )}
    </div>
  );
}
