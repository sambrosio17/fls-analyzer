import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useT } from '../../i18n.tsx';

/**
 * Profile × record type assignments as the brush and board views need them. Option ids are layout ids
 * or page names; '' is "no specific assignment" (pages: the app or org default).
 */
export interface AssignModel {
  editing: boolean;
  rows: { id: string; label: string; editable: boolean }[];
  cols: { id: string; label: string }[];
  /** What a cell can be set to, in display order; the index gives the colour. */
  options: { id: string; label: string }[];
  value: (row: string, col: string) => string;
  original: (row: string, col: string) => string;
  pending: (row: string, col: string) => boolean;
  /** What the profile sees when the cell has no specific assignment (pages only). */
  fallback?: (row: string, col: string) => string;
  set: (rows: string[], col: string, option: string) => void;
}

export const optionColor = (i: number) => `hsl(${(i * 67) % 360} 55% 55%)`;
const blockStyle = (i: number): CSSProperties => {
  const c = optionColor(i);
  return { background: `color-mix(in srgb, ${c} 16%, var(--surface))`, color: `color-mix(in srgb, ${c} 65%, var(--ink))`, borderColor: `color-mix(in srgb, ${c} 45%, transparent)` };
};

function useOptionIndex(model: AssignModel) {
  return useMemo(() => new Map(model.options.map((o, i) => [o.id, i])), [model.options]);
}

/** Pick a layout or page from the palette and paint cells, rows or columns with it. */
export function PaintView({ model }: { model: AssignModel }) {
  const t = useT();
  const p = t.views.paint;
  const index = useOptionIndex(model);
  const firstReal = model.options.find(o => o.id)?.id ?? '';
  const [brush, setBrush] = useState(firstReal);
  const painting = useRef(false);
  const touched = useRef(new Set<string>());
  useEffect(() => { if (!index.has(brush)) setBrush(firstReal); }, [model.options]);
  useEffect(() => {
    const up = () => { painting.current = false; touched.current.clear(); };
    document.addEventListener('mouseup', up);
    return () => document.removeEventListener('mouseup', up);
  }, []);

  const usage = (id: string) => model.rows.reduce((n, r) => n + model.cols.filter(c => model.value(r.id, c.id) === id).length, 0);
  const label = (id: string) => id ? model.options[index.get(id) ?? -1]?.label ?? id : p.none;
  const paint = (row: string, col: string) => {
    const k = `${row}|${col}`;
    if (touched.current.has(k)) return;
    touched.current.add(k);
    model.set([row], col, brush);
  };
  const editableRows = model.rows.filter(r => r.editable).map(r => r.id);

  return (
    <div className="paint">
      <div className="paint-pal" role="radiogroup" aria-label={p.brush}>
        <span className="muted small">{p.brush}</span>
        {model.options.map((o, i) => {
          const n = usage(o.id);
          return (
            <button key={o.id || 'none'} type="button" role="radio" aria-checked={brush === o.id} className={`brush${brush === o.id ? ' on' : ''}${!n && o.id ? ' unused' : ''}`}
              disabled={!model.editing} onClick={() => setBrush(o.id)}>
              <i style={o.id ? { background: optionColor(i) } : undefined} className={o.id ? '' : 'hatch'} />{o.id ? o.label : p.none}
              <span className="ct">{n || (o.id ? p.unused : 0)}</span>
            </button>
          );
        })}
      </div>
      <p className="muted small paint-hint">{model.editing ? p.hint : p.readOnly}</p>
      <div className="tbl-wrap">
        <table className={`paint-grid${model.editing ? ' editing' : ''}`}>
          <thead><tr><th>{t.layouts.profile}</th>{model.cols.map(c => (
            <th key={c.id}>{model.editing
              ? <button type="button" className="linklike" title={p.col} onClick={() => model.set(editableRows, c.id, brush)}>{c.label}</button>
              : c.label}</th>
          ))}</tr></thead>
          <tbody>
            {model.rows.map(r => (
              <tr key={r.id}>
                <th>{model.editing && r.editable
                    ? <button type="button" className="linklike" title={p.row} onClick={() => model.cols.forEach(c => model.set([r.id], c.id, brush))}>{r.label}</button>
                    : <span title={r.editable ? undefined : t.layouts.noFullName}>{r.label}</span>}</th>
                {model.cols.map(c => {
                  const v = model.value(r.id, c.id), pend = model.pending(r.id, c.id), i = index.get(v);
                  const shown = v ? label(v) : model.fallback?.(r.id, c.id) ?? '—';
                  return (
                    <td key={c.id} className={`pc${pend ? ' pend' : ''}${v ? '' : ' inh'}${model.editing && r.editable ? ' can' : ''}`}
                      onMouseDown={e => {
                        if (!model.editing || !r.editable || e.button !== 0) return;
                        e.preventDefault();
                        if (e.altKey) { setBrush(v); return; }
                        painting.current = true; touched.current.clear(); paint(r.id, c.id);
                      }}
                      onMouseEnter={() => { if (painting.current && r.editable) paint(r.id, c.id); }}>
                      <span className="blk" style={v && i !== undefined ? blockStyle(i) : undefined} title={`${r.label} · ${c.label}: ${shown}`}>
                        <span className="nm">{v ? shown : `↳ ${shown}`}</span>
                        {pend && <small>{p.was(label(model.original(r.id, c.id)))}</small>}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            {!model.rows.length && <tr><td colSpan={model.cols.length + 1} className="muted">{t.layouts.noProfiles}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** One column per layout or page, one card per profile; drag cards between columns, one record type at a time. */
export function BoardView({ model }: { model: AssignModel }) {
  const t = useT();
  const b = t.views.board;
  const p = t.views.paint;
  const index = useOptionIndex(model);
  const [col, setCol] = useState(model.cols[0]?.id ?? '');
  const [picked, setPicked] = useState(new Set<string>());
  const [over, setOver] = useState<string | null>(null);
  const c = model.cols.some(x => x.id === col) ? col : model.cols[0]?.id ?? '';
  useEffect(() => setPicked(new Set()), [c, model.editing]);

  const label = (id: string) => id ? model.options[index.get(id) ?? -1]?.label ?? id : p.none;
  const move = (rows: string[], lane: string) => { model.set(rows.filter(r => model.rows.find(x => x.id === r)?.editable), c, lane); setPicked(new Set()); };
  // Lanes: every option, plus "none" when a profile has no assignment and no "none" option exists.
  const lanes = model.options.some(o => !o.id) || !model.rows.some(r => !model.value(r.id, c))
    ? model.options : [{ id: '', label: p.none }, ...model.options];

  return (
    <div className="board-view">
      <div className="row board-top">
        <span className="muted small">{b.recordType}</span>
        {model.cols.map(x => <button key={x.id} type="button" className="chip" aria-pressed={x.id === c} onClick={() => setCol(x.id)}>{x.label}</button>)}
        <span className="spacer" />
        {picked.size > 0 ? <>
          <span className="small">{b.selected(picked.size)}</span>
          <select className="input sm" id="board-move" aria-label={b.moveTo} value="-" onChange={e => { if (e.target.value.startsWith('lane:')) move([...picked], e.target.value.slice(5)); }}>
            <option value="-" disabled>{b.moveTo}</option>
            {lanes.map(l => <option key={l.id || 'none'} value={`lane:${l.id}`}>{l.id ? l.label : p.none}</option>)}
          </select>
          <button type="button" className="btn sm" onClick={() => setPicked(new Set())}>{b.clear}</button>
        </> : <span className="muted small">{model.editing ? b.hint : b.readOnly}</span>}
      </div>
      <div className="board">
        {lanes.map(l => {
          const i = index.get(l.id);
          const cards = model.rows.filter(r => model.value(r.id, c) === l.id);
          return (
            <div key={l.id || 'none'} className={`lane${over === l.id ? ' over' : ''}`}
              onDragOver={e => { if (model.editing) { e.preventDefault(); setOver(l.id); } }} onDragLeave={() => setOver(o => o === l.id ? null : o)}
              onDrop={e => { e.preventDefault(); setOver(null); move(e.dataTransfer.getData('text/plain').split('\n').filter(Boolean), l.id); }}>
              <div className="lane-h"><i style={l.id && i !== undefined ? { background: optionColor(i) } : undefined} className={l.id ? '' : 'hatch'} />
                <b title={l.id ? l.label : p.none}>{l.id ? l.label : p.none}</b><span className="ct">{cards.length}</span></div>
              <div className="lane-b">
                {cards.map(r => {
                  const pend = model.pending(r.id, c), on = picked.has(r.id);
                  return (
                    <div key={r.id} className={`card${pend ? ' pend' : ''}${on ? ' picked' : ''}${r.editable ? '' : ' fixed'}`} draggable={model.editing && r.editable}
                      role="button" tabIndex={0} aria-pressed={on}
                      onClick={() => { if (!model.editing || !r.editable) return; setPicked(s => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; }); }}
                      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                      onDragStart={e => {
                        const ids = picked.has(r.id) ? [...picked] : [r.id];
                        e.dataTransfer.setData('text/plain', ids.join('\n'));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      title={r.editable ? undefined : t.layouts.noFullName}>
                      <span className="fl">{r.label}</span>
                      {!l.id && model.fallback && <span className="muted small">↳ {model.fallback(r.id, c)}</span>}
                      {pend && <span className="was">{b.before(label(model.original(r.id, c)))}</span>}
                    </div>
                  );
                })}
                {!cards.length && <div className="lane-empty">{l.id ? b.unused : b.empty}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
