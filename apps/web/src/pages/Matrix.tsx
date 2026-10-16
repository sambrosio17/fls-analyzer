import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MatrixHelp } from './MatrixHelp.tsx';
import { MultiPick, type PickOption } from '../MultiPick.tsx';
import { bounds, forEachCell, menuPosition, rangeSize, type CellRange } from '../cellRange.ts';
import { ACCESS_LONG, ACCESS_SHORT, api, type Access, type BulkAction, type FieldMeta, type Matrix, type Org, type PermSet, type SObject } from '../api.ts';

const lockedPs = (p: PermSet) => !!p.namespace || p.type === 'Group' || p.type === 'Muting';
type Filter = 'all' | 'custom' | 'none' | 'editall' | 'pending';
type PsKind = 'all' | 'profiles' | 'permsets';

// The grid only renders the cells in view, so every row and column has a fixed size.
const ROW_H = 48;
const COL_W = 112;
const OVERSCAN_ROWS = 8;
const OVERSCAN_COLS = 3;
const MAX_CHANGES = 200_000; // same limit as the server

type DisplayRow = { kind: 'obj'; object: string } | { kind: 'field'; i: number };

interface Props { org: Org; onChangeSet: (id: string, number: string) => void; initialObjects?: string[]; onObjectsChange?: (objects: string[]) => void; onDirtyChange?: (dirty: boolean) => void }

export function MatrixPage({ org, onChangeSet, initialObjects = [], onObjectsChange, onDirtyChange }: Props) {
  const [objects, setObjects] = useState<SObject[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [objectQuery, setObjectQuery] = useState('');
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Pending changes keyed by cell index (column * fieldCount + field). Mutated in place; `rev` triggers renders.
  const pending = useRef(new Map<number, Access>()).current;
  const [rev, setRev] = useState(0);
  const touch = () => setRev(r => r + 1);
  const [rows, setRows] = useState(new Set<number>());
  const [cols, setCols] = useState(new Set<number>());
  // Fields (API names) and permission sets (ids) ticked in the filters; empty means all.
  const [fieldPick, setFieldPick] = useState<string[]>([]);
  const [psPick, setPsPick] = useState<string[]>([]);
  const [psKind, setPsKind] = useState<PsKind>('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [bulkAction, setBulkAction] = useState<BulkAction>('read');
  const [creating, setCreating] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  // Cells picked by dragging the mouse, by position in `fields` and `columns`, and the menu shown for them.
  const [range, setRange] = useState<CellRange | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ active: boolean; moved: boolean; i: number; j: number; x: number; y: number }>({ active: false, moved: false, i: 0, j: 0, x: 0, y: 0 });

  useEffect(() => { api.objects(org.id).then(setObjects).catch(e => setError(e.message)); }, [org.id]);
  useEffect(() => { onDirtyChange?.(pending.size > 0); }, [rev > 0 && pending.size > 0]);
  // Reopens the objects a restored tab had.
  useEffect(() => { if (initialObjects.length) void load(initialObjects); }, []);

  const load = async (list: string[]) => {
    setSelected(list); setSent(null);
    onObjectsChange?.(list);
    discard(); setRows(new Set()); setCols(new Set()); setFieldPick([]);
    if (!list.length) { setMatrix(null); return; }
    setLoading(true); setError(null);
    try { setMatrix(await api.matrix(org.id, list)); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  };

  const allFields = matrix?.fields ?? [];
  const allPs = matrix?.permissionSets ?? [];
  const F = allFields.length;

  const base = useMemo(() => {
    const out = new Uint8Array(F * allPs.length);
    if (!matrix) return out;
    allPs.forEach((p, j) => {
      const s = matrix.access[p.id];
      if (s) for (let i = 0; i < F; i++) out[j * F + i] = s.charCodeAt(i) - 48;
    });
    return out;
  }, [matrix]);
  // Current values (base overlaid with pending), kept in sync by setCell so counts and filters read a typed array.
  const current = useMemo(() => base.slice(), [base]);
  const objectRead = useMemo(() => new Set((matrix?.objectRead ?? []).map(o => `${o.parentId}|${o.sobjectType}`)), [matrix]);

  const cur = (idx: number): Access => current[idx] as Access;
  const discard = () => { pending.clear(); current.set(base); touch(); };
  const locked = (f: FieldMeta, p: PermSet) => !f.permissionable || lockedPs(p);

  const columns = useMemo(() => {
    const picked = new Set(psPick);
    const out: number[] = [];
    allPs.forEach((p, j) => {
      if (psKind === 'profiles' && !p.isProfile) return;
      if (psKind === 'permsets' && p.isProfile) return;
      if (picked.size && !picked.has(p.id)) return;
      out.push(j);
    });
    return out;
  }, [matrix, psPick, psKind]);

  const fields = useMemo(() => {
    const picked = new Set(fieldPick);
    const out: number[] = [];
    allFields.forEach((f, i) => {
      if (picked.size && !picked.has(f.name)) return;
      if (filter === 'custom' && !f.custom) return;
      if (filter !== 'all' && filter !== 'custom') {
        if (!f.permissionable) return;
        if (filter === 'none' && !columns.every(j => cur(j * F + i) === 0)) return;
        if (filter === 'editall' && !(columns.length > 0 && columns.every(j => cur(j * F + i) === 2))) return;
        if (filter === 'pending' && !columns.some(j => pending.has(j * F + i))) return;
      }
      out.push(i);
    });
    return out;
  }, [matrix, fieldPick, filter, columns, filter === 'all' || filter === 'custom' ? 0 : rev]);

  const displayRows = useMemo(() => {
    const out: DisplayRow[] = [];
    let last = '';
    for (const i of fields) {
      const f = allFields[i]!;
      if (f.object !== last) { last = f.object; out.push({ kind: 'obj', object: f.object }); }
      out.push({ kind: 'field', i });
    }
    return out;
  }, [fields]);

  // Read / edit counts per column over the visible permissionable fields.
  const counts = useMemo(() => {
    const C = allPs.length;
    const read = new Int32Array(C), edit = new Int32Array(C);
    const visible = new Uint8Array(F);
    for (const i of fields) if (allFields[i]!.permissionable) visible[i] = 1;
    for (const j of columns) {
      let r = 0, e = 0;
      const off = j * F;
      for (let i = 0; i < F; i++) {
        if (!visible[i]) continue;
        const v = current[off + i]!;
        if (v > 0) r++;
        if (v === 2) e++;
      }
      read[j] = r; edit[j] = e;
    }
    return { read, edit };
  }, [current, fields, columns, rev]);

  const setCell = (f: FieldMeta, idx: number, value: Access) => {
    const v: Access = f.calculated && value === 2 ? 1 : value;
    if (v === base[idx]) pending.delete(idx); else pending.set(idx, v);
    current[idx] = v;
  };

  const clickCell = (i: number, j: number) => {
    const f = allFields[i]!;
    if (locked(f, allPs[j]!)) return;
    const idx = j * F + i;
    const states: Access[] = f.calculated ? [0, 1] : [0, 1, 2];
    setCell(f, idx, states[(states.indexOf(cur(idx)) + 1) % states.length]!);
    touch();
  };

  const targetFor = (action: BulkAction, c: Access): Access => action === 'read' ? 1 : action === 'edit' ? 2 : action === 'none' ? 0 : c === 2 ? 1 : c;

  const applyBulk = () => {
    for (const i of rows) {
      const f = allFields[i]!;
      for (const j of cols) {
        if (locked(f, allPs[j]!)) continue;
        const idx = j * F + i;
        setCell(f, idx, targetFor(bulkAction, cur(idx)));
      }
    }
    touch();
  };

  // ---- drag selection
  const fieldPos = useMemo(() => { const m = new Int32Array(F).fill(-1); fields.forEach((i, p) => { m[i] = p; }); return m; }, [fields]);
  const colPos = useMemo(() => { const m = new Int32Array(allPs.length).fill(-1); columns.forEach((j, p) => { m[j] = p; }); return m; }, [columns]);
  useEffect(() => { setRange(null); setMenu(null); }, [fields, columns]);

  const rangeStats = useMemo(() => {
    if (!range) return { cells: 0, editable: 0, pending: 0 };
    let editable = 0, pend = 0;
    forEachCell(range, fields, columns, (i, j) => {
      const f = allFields[i]!;
      if (!f.permissionable || locked(f, allPs[j]!)) return;
      editable++;
      if (pending.has(j * F + i)) pend++;
    });
    return { cells: rangeSize(range), editable, pending: pend };
  }, [range, rev]);

  const applyRange = (action: BulkAction | 'revert') => {
    if (!range) return;
    forEachCell(range, fields, columns, (i, j) => {
      const f = allFields[i]!;
      if (!f.permissionable || locked(f, allPs[j]!)) return;
      const idx = j * F + i;
      setCell(f, idx, action === 'revert' ? base[idx] as Access : targetFor(action, cur(idx)));
    });
    touch(); setMenu(null); setRange(null);
  };

  const cellAt = (x: number, y: number) => {
    const td = (document.elementFromPoint(x, y) as Element | null)?.closest<HTMLElement>('td[data-i]');
    if (!td || !scroller.current?.contains(td)) return null;
    return { i: Number(td.dataset.i), j: Number(td.dataset.j) };
  };
  const extendTo = (i: number, j: number) => {
    const r = fieldPos[i]!, c = colPos[j]!;
    if (r < 0 || c < 0) return;
    setRange(prev => prev && (prev.r1 !== r || prev.c1 !== c) ? { ...prev, r1: r, c1: c } : prev);
  };

  const onCellMouseDown = (e: React.MouseEvent, i: number, j: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setMenu(null);
    const r = fieldPos[i]!, c = colPos[j]!;
    if (e.shiftKey && range) setRange({ ...range, r1: r, c1: c });
    else setRange({ r0: r, c0: c, r1: r, c1: c });
    drag.current = { active: true, moved: e.shiftKey && !!range, i, j, x: e.clientX, y: e.clientY };
  };

  const onCellContextMenu = (e: React.MouseEvent, i: number, j: number) => {
    e.preventDefault();
    const r = fieldPos[i]!, c = colPos[j]!;
    const b = range && bounds(range);
    if (!b || r < b.top || r > b.bottom || c < b.left || c > b.right) setRange({ r0: r, c0: c, r1: r, c1: c });
    setMenu({ x: e.clientX, y: e.clientY });
  };

  // While dragging: follow the pointer, scroll the grid near its edges, and on release either cycle the one cell or open the menu.
  // The listeners are registered once and read the current render through `live`, so re-renders don't stop the scroll loop.
  const live = useRef({ cellAt, extendTo, clickCell, setRange, setMenu, headH: 90, fcolW: 280 });
  useEffect(() => {
    let raf = 0;
    const follow = (x: number, y: number) => {
      const d = drag.current, hit = live.current.cellAt(x, y);
      if (!hit) return;
      if (hit.i !== d.i || hit.j !== d.j) d.moved = true;
      live.current.extendTo(hit.i, hit.j);
    };
    const tick = () => {
      raf = 0;
      const d = drag.current, el = scroller.current;
      if (!d.active || !el) return;
      const { headH, fcolW } = live.current;
      const box = el.getBoundingClientRect(), edge = 40, step = 18;
      let dx = 0, dy = 0;
      if (d.y > box.bottom - edge) dy = step; else if (d.y < box.top + headH + edge / 2) dy = -step;
      if (d.x > box.right - edge) dx = step; else if (d.x < box.left + fcolW + edge / 2) dx = -step;
      if (dx || dy) {
        el.scrollBy(dx, dy);
        follow(Math.min(Math.max(d.x, box.left + fcolW + 1), box.right - 2), Math.min(Math.max(d.y, box.top + headH + 1), box.bottom - 2));
      }
      raf = requestAnimationFrame(tick);
    };
    const move = (e: MouseEvent) => {
      const d = drag.current;
      if (!d.active) return;
      d.x = e.clientX; d.y = e.clientY;
      follow(e.clientX, e.clientY);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const up = (e: MouseEvent) => {
      const d = drag.current;
      if (!d.active) return;
      d.active = false;
      cancelAnimationFrame(raf); raf = 0;
      if (!d.moved) { live.current.clickCell(d.i, d.j); live.current.setRange(null); return; }
      live.current.setMenu({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    if (!menu && !range) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenu(null); setRange(null); } };
    const down = (e: MouseEvent) => { if (menu && !(e.target as Element).closest?.('.cell-menu')) setMenu(null); };
    document.addEventListener('keydown', key);
    document.addEventListener('mousedown', down);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('mousedown', down); };
  }, [menu, range]);

  const createChangeSet = async () => {
    if (pending.size > MAX_CHANGES) {
      setError(`Troppe modifiche per un solo change set (${pending.size.toLocaleString('it-IT')}, massimo ${MAX_CHANGES.toLocaleString('it-IT')}). Dividile in più change set, per esempio filtrando i profili.`);
      return;
    }
    setCreating(true); setError(null);
    try {
      const changes = [...pending].map(([idx, access]) => ({ parentId: allPs[Math.floor(idx / F)]!.id, field: allFields[idx % F]!.name, access }));
      const cs = await api.createChangeSet(org.id, { changes, description: `${new Set(changes.map(c => c.field)).size} campi su ${new Set(changes.map(c => c.parentId)).size} profili/permission set` });
      // The tab stays open next to the change set: the changes now live there, so the grid goes back to the org's values.
      discard(); setSent(cs.number); setCreating(false);
      onChangeSet(cs.id, cs.number);
    } catch (e) { setError((e as Error).message); setCreating(false); }
  };

  const toggle = (set: Set<number>, value: number, update: (s: Set<number>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    update(next);
  };

  // ---- virtual window
  const scroller = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLTableSectionElement>(null);
  const fcol = useRef<HTMLTableCellElement>(null);
  const [view, setView] = useState({ top: 0, left: 0, width: 1200, height: 600, headH: 90, fcolW: 280 });
  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    const next = { top: el.scrollTop, left: el.scrollLeft, width: el.clientWidth, height: el.clientHeight, headH: head.current?.offsetHeight ?? 90, fcolW: fcol.current?.offsetWidth ?? 280 };
    setView(v => (v.top === next.top && v.left === next.left && v.width === next.width && v.height === next.height && v.headH === next.headH && v.fcolW === next.fcolW) ? v : next);
  };
  const frame = useRef(0);
  const onScroll = () => { cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(measure); };
  useLayoutEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [matrix, loading]);

  const firstRow = Math.max(0, Math.floor((view.top - view.headH) / ROW_H) - OVERSCAN_ROWS);
  const lastRow = Math.min(displayRows.length, Math.ceil((view.top + view.height) / ROW_H) + OVERSCAN_ROWS);
  const firstCol = Math.max(0, Math.floor(view.left / COL_W) - OVERSCAN_COLS);
  const lastCol = Math.min(columns.length, Math.ceil((view.left + view.width - view.fcolW) / COL_W) + OVERSCAN_COLS);
  const visCols = columns.slice(firstCol, lastCol);
  const leftPad = firstCol * COL_W, rightPad = (columns.length - lastCol) * COL_W;
  const padCells = (pad: number, k: string) => pad > 0 ? <td className="pad" key={k} style={{ width: pad, minWidth: pad }} /> : null;

  const fieldOptions = useMemo<PickOption[]>(() => allFields.map(f => ({ id: f.name, label: f.label, sub: f.name })), [matrix]);
  const psOptions = useMemo<PickOption[]>(() => allPs
    .filter(p => psKind === 'all' || (psKind === 'profiles') === p.isProfile)
    .map(p => ({ id: p.id, label: p.label, sub: p.isProfile ? 'profilo' : p.name })), [matrix, psKind]);
  const rb = range && bounds(range);
  live.current = { cellAt, extendTo, clickCell, setRange, setMenu, headH: view.headH, fcolW: view.fcolW };
  const permissionableVisible = fields.filter(i => allFields[i]!.permissionable);
  const objectMatches = objectQuery.length < 2 ? [] : objects.filter(o =>
    !selected.includes(o.name) && (o.label.toLowerCase().includes(objectQuery.toLowerCase()) || o.name.toLowerCase().includes(objectQuery.toLowerCase()))).slice(0, 8);

  return (
    <>
      <div className="view-head">
        <div><div className="eyebrow">{org.label}</div><h1>Matrice Field Level Security</h1>
          <p>Scegli gli oggetti. Clicca una cella per cambiarla, trascina il mouse su più celle per scegliere l'accesso da un menu, oppure seleziona righe e colonne e applica un'azione in blocco. Niente viene scritto finché non confermi l'anteprima.</p></div>
        <span className="spacer" />
        <button className="btn" onClick={() => setHelp(true)}>? Guida</button>
      </div>
      <MatrixHelp open={help} onClose={() => setHelp(false)} />

      <section className="panel panel-b object-picker">
        <div className="row">
          {selected.map(o => (
            <span className="chip on" key={o}>{o}<button aria-label={`Togli ${o}`} onClick={() => load(selected.filter(x => x !== o))}>×</button></span>
          ))}
          <div className="combo">
            <input className="input" id="object-search" placeholder="Aggiungi oggetto (es. Account)" value={objectQuery} onChange={e => setObjectQuery(e.target.value)} />
            {objectMatches.length > 0 && (
              <ul className="combo-list">
                {objectMatches.map(o => (
                  <li key={o.name}><button onClick={() => { setObjectQuery(''); load([...selected, o.name]); }}>{o.label} <span className="mono muted">{o.name}</span></button></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {error && <div className="banner prod">{error}</div>}
      {sent && <div className="banner info">Le modifiche sono nel change set {sent}. Dopo averlo applicato, ricarica la matrice per vedere i valori aggiornati. <button className="btn sm" onClick={() => load(selected)}>Ricarica</button></div>}
      {matrix?.warnings?.length ? (
        <div className="banner info">Non sono riuscito a leggere i campi che il tuo utente non vede, quindi potrebbero mancare. Dettaglio: <span className="mono">{matrix.warnings.join(' · ')}</span></div>
      ) : null}
      {loading && <p className="muted">Lettura di campi, profili e FieldPermissions…</p>}
      {!matrix && !loading && <div className="panel empty">Aggiungi uno o più oggetti per vedere la matrice.</div>}

      {matrix && !loading && (
        <>
          <div className="toolbar">
            <MultiPick id="field-pick" label="Campi" allLabel="tutti" options={fieldOptions} selected={fieldPick} onChange={setFieldPick} />
            <MultiPick id="ps-pick" label="Profili e permission set" allLabel="tutti" options={psOptions} selected={psPick} onChange={setPsPick} />
            <select className="input" id="ps-kind" value={psKind} onChange={e => setPsKind(e.target.value as PsKind)}>
              <option value="all">Profili e permission set</option><option value="profiles">Solo profili</option><option value="permsets">Solo permission set</option>
            </select>
            {([['all', 'Tutti'], ['none', 'Non visibili a nessuno'], ['editall', 'Modificabili da tutti'], ['custom', 'Solo custom'], ['pending', 'Con modifiche']] as const).map(([f, l]) => (
              <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{l}</button>
            ))}
          </div>

          <div className="selbar">
            <span><b>{rows.size}</b> campi · <b>{cols.size}</b> profili/permission set selezionati</span>
            <select className="input" id="bulk-action" value={bulkAction} onChange={e => setBulkAction(e.target.value as BulkAction)}>
              <option value="read">Lettura</option><option value="edit">Lettura e modifica</option>
              <option value="removeEdit">Togli la modifica</option><option value="none">Nessun accesso</option>
            </select>
            <button className="btn sm" disabled={!rows.size || !cols.size} onClick={applyBulk}>Applica alla selezione</button>
            <button className="btn sm" disabled={!rows.size && !cols.size} onClick={() => { setRows(new Set()); setCols(new Set()); }}>Deseleziona</button>
            <span className="spacer" />
            <span className={pending.size ? 'warn-text' : 'muted'}><b>{pending.size}</b> modifiche in sospeso</span>
            <button className="btn sm danger" disabled={!pending.size} onClick={discard}>Scarta</button>
            <button className="btn sm primary" disabled={!pending.size || creating} onClick={createChangeSet}>{creating ? 'Preparo l\'anteprima…' : 'Vai all\'anteprima'}</button>
          </div>

          <p className="muted mx-size">{fields.length} campi × {columns.length} profili/permission set</p>

          <div className="scroller" ref={scroller} onScroll={onScroll}>
            <table className="mx" style={{ width: view.fcolW + columns.length * COL_W }}>
              <thead ref={head}>
                <tr>
                  <th className="fcol" ref={fcol}>
                    <label className="check"><input type="checkbox" id="all-rows"
                      checked={permissionableVisible.length > 0 && permissionableVisible.every(i => rows.has(i))}
                      onChange={e => setRows(e.target.checked ? new Set(permissionableVisible) : new Set())} />Campo</label>
                    {columns.length > 0 && (
                      <label className="check"><input type="checkbox" id="all-cols"
                        checked={columns.every(j => lockedPs(allPs[j]!) || cols.has(j))}
                        onChange={e => setCols(e.target.checked ? new Set(columns.filter(j => !lockedPs(allPs[j]!))) : new Set())} />Tutte le colonne</label>
                    )}
                  </th>
                  {padCells(leftPad, 'lp')}
                  {visCols.map(j => {
                    const p = allPs[j]!;
                    return (
                      <th key={p.id} className="pcol"><div className="ps-h">
                        <span className="kind">{p.isProfile ? 'Profilo' : 'Perm. set'}</span>
                        <span className="nm" title={`${p.label} (${p.name})`}>{p.namespace ? '🔒 ' : ''}{p.label}</span>
                        <span className="ct">L {counts.read[j]} · M {counts.edit[j]}</span>
                        <label><input type="checkbox" disabled={lockedPs(p)} checked={cols.has(j)} onChange={() => toggle(cols, j, setCols)} />seleziona</label>
                      </div></th>
                    );
                  })}
                  {padCells(rightPad, 'rp')}
                </tr>
              </thead>
              <tbody>
                {firstRow > 0 && <tr className="spacer-row" style={{ height: firstRow * ROW_H }}><td colSpan={visCols.length + 3} /></tr>}
                {displayRows.slice(firstRow, lastRow).map(row => {
                  if (row.kind === 'obj') {
                    return (
                      <tr className="obj" key={`obj-${row.object}`}><th>{row.object}</th>
                        {padCells(leftPad, 'lp')}
                        {visCols.map(j => <td key={j}>{objectRead.has(`${allPs[j]!.id}|${row.object}`) ? '' : <span className="warn-text" title="Nessuna lettura sull'oggetto">⚠ oggetto</span>}</td>)}
                        {padCells(rightPad, 'rp')}
                      </tr>
                    );
                  }
                  const i = row.i, f = allFields[i]!;
                  return (
                    <tr key={f.name} className={rows.has(i) ? 'sel' : ''}>
                      <th><div className="fh">
                        <input type="checkbox" id={`r-${f.name}`} disabled={!f.permissionable} checked={rows.has(i)} onChange={() => toggle(rows, i, setRows)} />
                        <label htmlFor={`r-${f.name}`} title={f.label}>{f.label}</label>
                        <span className="api" title={f.name}>{f.name}</span>
                        <span className="tags">{f.hiddenFromUser && <span className="tag" title="Il tuo utente non vede questo campo: Salesforce non lo restituisce nel describe">Nascosto a te</span>}<span className="tag">{f.type}</span>{!f.permissionable && <span className="tag">Senza FLS</span>}{f.calculated && <span className="tag">Solo lettura</span>}{f.encrypted && <span className="tag sens">Crittografato</span>}</span>
                      </div></th>
                      {padCells(leftPad, 'lp')}
                      {visCols.map(j => {
                        const p = allPs[j]!;
                        if (!f.permissionable) {
                          const pk = !!rb && fieldPos[i]! >= rb.top && fieldPos[i]! <= rb.bottom && colPos[j]! >= rb.left && colPos[j]! <= rb.right;
                          return <td key={j} data-i={i} data-j={j} className={`c locked${pk ? ' rsel' : ''}`} onMouseDown={e => onCellMouseDown(e, i, j)} onContextMenu={e => onCellContextMenu(e, i, j)}>
                            <button disabled title="Campo senza FLS: sempre visibile">sempre</button></td>;
                        }
                        const idx = j * F + i;
                        const v = cur(idx), b = base[idx] as Access, isPending = pending.has(idx);
                        const r = fieldPos[i]!, c = colPos[j]!;
                        const picked = !!rb && r >= rb.top && r <= rb.bottom && c >= rb.left && c <= rb.right;
                        return (
                          <td key={j} data-i={i} data-j={j} className={`c v${v}${isPending ? ' pend' : ''}${locked(f, p) ? ' locked' : ''}${cols.has(j) ? ' colsel' : ''}${picked ? ' rsel' : ''}`}
                            onMouseDown={e => onCellMouseDown(e, i, j)} onContextMenu={e => onCellContextMenu(e, i, j)}>
                            {/* Mouse clicks are handled on mousedown/up (they may start a drag); this onClick is for the keyboard. */}
                            <button onClick={e => { if (e.detail === 0) clickCell(i, j); }} title={`${p.label} · ${f.name}: ${ACCESS_LONG[v]}${isPending ? ` (prima: ${ACCESS_LONG[b]})` : ''}`}>
                              <span className="v">{ACCESS_SHORT[v]}</span>{isPending && <span className="was">da {ACCESS_SHORT[b]}</span>}
                            </button>
                          </td>
                        );
                      })}
                      {padCells(rightPad, 'rp')}
                    </tr>
                  );
                })}
                {lastRow < displayRows.length && <tr className="spacer-row" style={{ height: (displayRows.length - lastRow) * ROW_H }}><td colSpan={visCols.length + 3} /></tr>}
              </tbody>
            </table>
          </div>
          {menu && range && (
            <CellMenu x={menu.x} y={menu.y} stats={rangeStats} onPick={applyRange} onClose={() => { setMenu(null); setRange(null); }} />
          )}
          <div className="legend">
            <span><span className="box">—</span>Nessun accesso</span><span><span className="box b1">L</span>Lettura</span><span><span className="box b2">L+M</span>Lettura e modifica</span>
            <span><span className="box bp" />Modifica in sospeso</span><span><span className="box bl" />Non modificabile</span>
          </div>
        </>
      )}
    </>
  );
}

const MENU_W = 240, MENU_H = 290;

/** Access choices for the cells picked by dragging. */
function CellMenu({ x, y, stats, onPick, onClose }: {
  x: number; y: number; stats: { cells: number; editable: number; pending: number };
  onPick: (action: BulkAction | 'revert') => void; onClose: () => void;
}) {
  const pos = menuPosition(x, y, MENU_W, MENU_H, window.innerWidth, window.innerHeight);
  const none = stats.editable === 0;
  return (
    <div className="cell-menu" role="menu" style={pos} onContextMenu={e => e.preventDefault()}>
      <div className="cell-menu-h">{stats.cells === 1 ? '1 cella' : `${stats.cells} celle`}{stats.editable !== stats.cells && ` · ${stats.editable} modificabili`}</div>
      <button role="menuitem" disabled={none} onClick={() => onPick('none')}><span className="box">—</span>Nessun accesso</button>
      <button role="menuitem" disabled={none} onClick={() => onPick('read')}><span className="box b1">L</span>Lettura</button>
      <button role="menuitem" disabled={none} onClick={() => onPick('edit')}><span className="box b2">L+M</span>Lettura e modifica</button>
      <button role="menuitem" disabled={none} onClick={() => onPick('removeEdit')}><span className="box b1">L</span>Togli solo la modifica</button>
      <hr />
      <button role="menuitem" disabled={!stats.pending} onClick={() => onPick('revert')}><span className="box bp" />Ripristina i valori dell'org{stats.pending ? ` (${stats.pending})` : ''}</button>
      <button role="menuitem" onClick={onClose}><span className="box" />Annulla selezione</button>
    </div>
  );
}
