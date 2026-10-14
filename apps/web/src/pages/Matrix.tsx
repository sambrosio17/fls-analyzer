import { useEffect, useMemo, useState } from 'react';
import { ACCESS_LONG, ACCESS_SHORT, api, type Access, type BulkAction, type FieldMeta, type Matrix, type Org, type PermSet, type SObject } from '../api.ts';

const key = (parentId: string, field: string) => `${parentId}|${field}`;
const locked = (f: FieldMeta, p: PermSet) => !f.permissionable || !!p.namespace || p.type === 'Group' || p.type === 'Muting';
type Filter = 'all' | 'custom' | 'none' | 'editall' | 'pending';

interface Props { org: Org; onChangeSet: (id: string) => void }

export function MatrixPage({ org, onChangeSet }: Props) {
  const [objects, setObjects] = useState<SObject[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [objectQuery, setObjectQuery] = useState('');
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(new Map<string, Access>());
  const [rows, setRows] = useState(new Set<string>());
  const [cols, setCols] = useState(new Set<string>());
  const [search, setSearch] = useState('');
  const [psSearch, setPsSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [bulkAction, setBulkAction] = useState<BulkAction>('read');
  const [creating, setCreating] = useState(false);

  useEffect(() => { api.objects(org.id).then(setObjects).catch(e => setError(e.message)); }, [org.id]);

  const load = async (list: string[]) => {
    setSelected(list);
    setPending(new Map()); setRows(new Set()); setCols(new Set());
    if (!list.length) { setMatrix(null); return; }
    setLoading(true); setError(null);
    try { setMatrix(await api.matrix(org.id, list)); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  };

  const base = useMemo(() => new Map((matrix?.cells ?? []).map(c => [key(c.parentId, c.field), c.access])), [matrix]);
  const objectRead = useMemo(() => new Set((matrix?.objectRead ?? []).map(o => key(o.parentId, o.sobjectType))), [matrix]);
  const baseOf = (k: string): Access => base.get(k) ?? 0;
  const cur = (k: string): Access => pending.get(k) ?? baseOf(k);

  const columns = useMemo(() => (matrix?.permissionSets ?? []).filter(p => !psSearch || p.label.toLowerCase().includes(psSearch.toLowerCase())), [matrix, psSearch]);
  const fields = useMemo(() => {
    const q = search.toLowerCase();
    return (matrix?.fields ?? []).filter(f => {
      if (q && !f.label.toLowerCase().includes(q) && !f.name.toLowerCase().includes(q)) return false;
      if (filter === 'custom') return f.custom;
      if (filter === 'all') return true;
      if (!f.permissionable) return false;
      const vals = columns.map(p => cur(key(p.id, f.name)));
      if (filter === 'none') return vals.every(v => v === 0);
      if (filter === 'editall') return vals.length > 0 && vals.every(v => v === 2);
      return columns.some(p => pending.has(key(p.id, f.name)));
    });
  }, [matrix, search, filter, columns, pending]);

  const setCell = (next: Map<string, Access>, f: FieldMeta, p: PermSet, value: Access) => {
    const k = key(p.id, f.name);
    const v: Access = f.calculated && value === 2 ? 1 : value;
    if (v === baseOf(k)) next.delete(k); else next.set(k, v);
  };

  const clickCell = (f: FieldMeta, p: PermSet) => {
    if (locked(f, p)) return;
    const states: Access[] = f.calculated ? [0, 1] : [0, 1, 2];
    const next = new Map(pending);
    setCell(next, f, p, states[(states.indexOf(cur(key(p.id, f.name))) + 1) % states.length]!);
    setPending(next);
  };

  const applyBulk = () => {
    if (!matrix) return;
    const next = new Map(pending);
    for (const f of matrix.fields.filter(x => rows.has(x.name))) {
      for (const p of matrix.permissionSets.filter(x => cols.has(x.id))) {
        if (locked(f, p)) continue;
        const c = cur(key(p.id, f.name));
        const target: Access = bulkAction === 'read' ? 1 : bulkAction === 'edit' ? 2 : bulkAction === 'none' ? 0 : c === 2 ? 1 : c;
        setCell(next, f, p, target);
      }
    }
    setPending(next);
  };

  const createChangeSet = async () => {
    setCreating(true); setError(null);
    try {
      const changes = [...pending].map(([k, access]) => { const [parentId, field] = k.split('|') as [string, string]; return { parentId, field, access }; });
      const cs = await api.createChangeSet(org.id, { changes, description: `${new Set(changes.map(c => c.field)).size} campi su ${new Set(changes.map(c => c.parentId)).size} profili/permission set` });
      onChangeSet(cs.id);
    } catch (e) { setError((e as Error).message); setCreating(false); }
  };

  const toggle = (set: Set<string>, value: string, update: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    update(next);
  };

  const objectMatches = objectQuery.length < 2 ? [] : objects.filter(o =>
    !selected.includes(o.name) && (o.label.toLowerCase().includes(objectQuery.toLowerCase()) || o.name.toLowerCase().includes(objectQuery.toLowerCase()))).slice(0, 8);

  let lastObject = '';
  return (
    <>
      <div className="view-head">
        <div><div className="eyebrow">{org.name}</div><h1>Matrice Field Level Security</h1>
          <p>Scegli gli oggetti. Clicca una cella per cambiarla, oppure seleziona righe e colonne e applica un'azione in blocco. Niente viene scritto finché non confermi l'anteprima.</p></div>
      </div>

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
      {loading && <p className="muted">Lettura di campi, profili e FieldPermissions…</p>}
      {!matrix && !loading && <div className="panel empty">Aggiungi uno o più oggetti per vedere la matrice.</div>}

      {matrix && !loading && (
        <>
          <div className="toolbar">
            <input className="input" id="field-search" type="search" placeholder="Cerca campo" value={search} onChange={e => setSearch(e.target.value)} />
            <input className="input" id="ps-search" type="search" placeholder="Filtra profili e permission set" value={psSearch} onChange={e => setPsSearch(e.target.value)} />
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
            <button className="btn sm danger" disabled={!pending.size} onClick={() => setPending(new Map())}>Scarta</button>
            <button className="btn sm primary" disabled={!pending.size || creating} onClick={createChangeSet}>{creating ? 'Preparo l\'anteprima…' : 'Vai all\'anteprima'}</button>
          </div>

          <div className="scroller">
            <table className="mx">
              <thead>
                <tr>
                  <th className="fcol">
                    <label className="check"><input type="checkbox" id="all-rows"
                      checked={fields.length > 0 && fields.every(f => !f.permissionable || rows.has(f.name))}
                      onChange={e => setRows(e.target.checked ? new Set(fields.filter(f => f.permissionable).map(f => f.name)) : new Set())} />Campo</label>
                  </th>
                  {columns.map(p => {
                    const visible = fields.filter(f => f.permissionable);
                    const r = visible.filter(f => cur(key(p.id, f.name)) > 0).length;
                    const e = visible.filter(f => cur(key(p.id, f.name)) === 2).length;
                    return (
                      <th key={p.id}><div className="ps-h">
                        <span className="kind">{p.isProfile ? 'Profilo' : 'Perm. set'}</span>
                        <span className="nm" title={p.name}>{p.namespace ? '🔒 ' : ''}{p.label}</span>
                        <span className="ct">L {r} · M {e}</span>
                        <label><input type="checkbox" disabled={!!p.namespace} checked={cols.has(p.id)} onChange={() => toggle(cols, p.id, setCols)} />seleziona</label>
                      </div></th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {fields.map(f => {
                  const header = f.object !== lastObject ? (lastObject = f.object) : null;
                  return [
                    header && (
                      <tr className="obj" key={`obj-${f.object}`}><th>{f.object}</th>
                        {columns.map(p => <td key={p.id}>{objectRead.has(key(p.id, f.object)) ? '' : <span className="warn-text" title="Nessuna lettura sull'oggetto">⚠ oggetto</span>}</td>)}
                      </tr>
                    ),
                    <tr key={f.name} className={rows.has(f.name) ? 'sel' : ''}>
                      <th><div className="fh">
                        <input type="checkbox" id={`r-${f.name}`} disabled={!f.permissionable} checked={rows.has(f.name)} onChange={() => toggle(rows, f.name, setRows)} />
                        <label htmlFor={`r-${f.name}`}>{f.label}</label>
                        <span className="api">{f.name}</span>
                        <span className="tags"><span className="tag">{f.type}</span>{!f.permissionable && <span className="tag">Senza FLS</span>}{f.calculated && <span className="tag">Solo lettura</span>}{f.encrypted && <span className="tag sens">Crittografato</span>}</span>
                      </div></th>
                      {columns.map(p => {
                        const k = key(p.id, f.name);
                        if (!f.permissionable) return <td key={p.id} className="c locked"><button disabled title="Campo senza FLS: sempre visibile">sempre</button></td>;
                        const v = cur(k), b = baseOf(k), isPending = pending.has(k);
                        return (
                          <td key={p.id} className={`c v${v}${isPending ? ' pend' : ''}${locked(f, p) ? ' locked' : ''}${cols.has(p.id) ? ' colsel' : ''}`}>
                            <button onClick={() => clickCell(f, p)} title={`${p.label} · ${f.name}: ${ACCESS_LONG[v]}${isPending ? ` (prima: ${ACCESS_LONG[b]})` : ''}`}>
                              <span className="v">{ACCESS_SHORT[v]}</span>{isPending && <span className="was">da {ACCESS_SHORT[b]}</span>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ];
                })}
              </tbody>
            </table>
          </div>
          <div className="legend">
            <span><span className="box">—</span>Nessun accesso</span><span><span className="box b1">L</span>Lettura</span><span><span className="box b2">L+M</span>Lettura e modifica</span>
            <span><span className="box bp" />Modifica in sospeso</span><span><span className="box bl" />Non modificabile</span>
          </div>
        </>
      )}
    </>
  );
}
