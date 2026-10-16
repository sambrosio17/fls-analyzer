import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface PickOption { id: string; label: string; sub?: string }

/** Options whose label or sub-label contains every word of the query (case-insensitive). */
export function matchOptions(options: PickOption[], query: string): PickOption[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return options;
  return options.filter(o => {
    const text = `${o.label} ${o.sub ?? ''}`.toLowerCase();
    return words.every(w => text.includes(w));
  });
}

const SHOWN = 200;

/**
 * Filter that picks values: search, tick the results you want, and only those are shown.
 * Nothing ticked means no filter.
 */
export function MultiPick({ id, label, allLabel, options, selected, onChange }: {
  id: string; label: string; allLabel: string; options: PickOption[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const chosen = useMemo(() => new Set(selected), [selected]);
  const matches = useMemo(() => matchOptions(options, query), [options, query]);
  const byId = useMemo(() => new Map(options.map(o => [o.id, o])), [options]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  const toggle = (oid: string) => onChange(chosen.has(oid) ? selected.filter(x => x !== oid) : [...selected, oid]);
  const allMatched = matches.length > 0 && matches.every(o => chosen.has(o.id));
  const pickMatches = () => {
    if (allMatched) { const drop = new Set(matches.map(o => o.id)); onChange(selected.filter(x => !drop.has(x))); }
    else onChange([...selected, ...matches.filter(o => !chosen.has(o.id)).map(o => o.id)]);
  };
  const summary = selected.length === 0 ? allLabel
    : selected.length === 1 ? byId.get(selected[0]!)?.label ?? '1 scelto' : `${selected.length} scelti`;

  return (
    <div className="pick" ref={box}>
      <button type="button" id={id} className={`input pick-btn${selected.length ? ' on' : ''}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="pick-label">{label}:</span> <span className="pick-sum">{summary}</span>
        {selected.length > 0 && <span className="pick-clear" role="button" aria-label={`Togli il filtro ${label}`} onClick={e => { e.stopPropagation(); onChange([]); }}>×</span>}
      </button>
      {open && (
        <div className="pick-pop">
          <input className="input" type="search" autoFocus placeholder={`Cerca ${label.toLowerCase()}`} value={query} onChange={e => setQuery(e.target.value)} aria-controls={listId} />
          <div className="pick-actions">
            <button type="button" className="btn sm" disabled={!matches.length} onClick={pickMatches}>
              {allMatched ? 'Togli' : 'Spunta'} {query ? `i ${matches.length} risultati` : `tutti (${matches.length})`}
            </button>
            {selected.length > 0 && <button type="button" className="btn sm" onClick={() => onChange([])}>Svuota ({selected.length})</button>}
          </div>
          <ul className="pick-list" id={listId} role="listbox" aria-multiselectable="true">
            {matches.slice(0, SHOWN).map(o => (
              <li key={o.id} role="option" aria-selected={chosen.has(o.id)}>
                <label><input type="checkbox" checked={chosen.has(o.id)} onChange={() => toggle(o.id)} />
                  <span>{o.label}{o.sub && <small className="muted mono"> {o.sub}</small>}</span></label>
              </li>
            ))}
            {matches.length === 0 && <li className="muted pick-note">Nessun risultato.</li>}
            {matches.length > SHOWN && <li className="muted pick-note">Altri {matches.length - SHOWN}: affina la ricerca.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
