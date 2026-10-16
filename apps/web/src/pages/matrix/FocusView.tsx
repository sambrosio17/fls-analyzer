import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../i18n.tsx';
import type { Access } from '../../api.ts';
import { levelsFor, lockedPs, type MatrixModel } from './model.ts';

type Only = 'all' | 'diff' | 'none' | 'pending';
const SIDE_SHOWN = 300;
const MAIN_STEP = 300;
const MAX_COMPARE = 3;

/** Nothing / Read / Edit as three buttons; the current one is filled. */
export function Levels({ model, levels, value, pending, disabled, onPick, label }: {
  model: MatrixModel; levels: Access[]; value: Access | null; pending?: boolean; disabled?: boolean; onPick: (v: Access) => void; label: string;
}) {
  const t = useT();
  const names = model.apex ? t.apex.access.long : t.views.levels;
  return (
    <span className={`lvl${pending ? ' pend' : ''}`} role="group" aria-label={label}>
      {([0, 1, 2] as Access[]).map(k => (model.apex && k === 2) ? null : (
        <button key={k} type="button" className={value === k ? `on v${k}` : ''} aria-pressed={value === k}
          disabled={disabled || !levels.includes(k)} onClick={() => onPick(k)}>{names[k]}</button>
      ))}
    </span>
  );
}

/**
 * One profile or permission set at a time (or one field, turning the view): every row has explicit
 * access buttons, and up to three others can be shown next to it to compare and copy.
 */
export function FocusView({ model }: { model: MatrixModel }) {
  const t = useT();
  const v = t.views.focus;
  const { allFields, allPs, F, fields, columns, cur, apex } = model;
  const short = apex ? t.apex.access.short : t.access.short;
  const long = apex ? t.apex.access.long : t.access.long;
  const [pivot, setPivot] = useState<'ps' | 'field'>('ps');
  const [primary, setPrimary] = useState<number | null>(null);
  const [field, setField] = useState<number | null>(null);
  const [compare, setCompare] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'p' | 's'>('all');
  const [sel, setSel] = useState(new Set<number>());
  const [only, setOnly] = useState<Only>('all');
  const [shown, setShown] = useState(MAIN_STEP);

  // Keep the open profile and field inside what the filters leave.
  const j = primary !== null && columns.includes(primary) ? primary : columns[0] ?? null;
  const i0 = field !== null && fields.includes(field) ? field : fields.find(i => allFields[i]!.permissionable) ?? fields[0] ?? null;
  const cmp = compare.filter(k => columns.includes(k) && k !== j);
  useEffect(() => { setSel(new Set()); setShown(MAIN_STEP); }, [pivot, j, i0]);

  const visibleFls = useMemo(() => fields.filter(i => allFields[i]!.permissionable).length, [fields]);
  const q = query.trim().toLowerCase();
  const sideCols = useMemo(() => columns.filter(k => {
    const p = allPs[k]!;
    if (kind === 'p' && !p.isProfile) return false;
    if (kind === 's' && p.isProfile) return false;
    return !q || `${p.label} ${p.name}`.toLowerCase().includes(q);
  }), [columns, kind, q]);
  const sideFields = useMemo(() => fields.filter(i => !q || `${allFields[i]!.label} ${allFields[i]!.name}`.toLowerCase().includes(q)), [fields, q]);
  // Per field, how many visible permission sets read and edit it (field pivot only).
  const fieldCounts = useMemo(() => {
    if (pivot !== 'field') return null;
    const read = new Int32Array(F), edit = new Int32Array(F);
    for (const i of sideFields.slice(0, SIDE_SHOWN)) for (const k of columns) { const x = cur(k * F + i); if (x) read[i]!++; if (x === 2) edit[i]!++; }
    return { read, edit };
  }, [pivot, sideFields, columns, model.rev]);

  const done = () => { setSel(new Set()); model.commit(); };
  const toggleSel = (x: number) => setSel(s => { const n = new Set(s); if (n.has(x)) n.delete(x); else n.add(x); return n; });
  const meter = (r: number, e: number, n: number) => (
    <span className="meter" aria-hidden="true"><i className="e" style={{ width: `${n ? e / n * 100 : 0}%` }} /><i className="r" style={{ width: `${n ? (r - e) / n * 100 : 0}%` }} /></span>
  );
  const kindLabel = (k: number) => allPs[k]!.isProfile ? t.export.profile : t.export.permSet;

  const side = (
    <aside className="panel focus-side">
      <div className="focus-side-h">
        <div className="seg seg-btn" role="group" aria-label={t.views.label}>
          <button type="button" aria-pressed={pivot === 'ps'} onClick={() => { setPivot('ps'); setQuery(''); }}>{v.byPs}</button>
          <button type="button" aria-pressed={pivot === 'field'} onClick={() => { setPivot('field'); setQuery(''); }}>{apex ? v.byClass : v.byField}</button>
        </div>
        <input className="input" id="focus-search" placeholder={pivot === 'ps' ? v.searchPs : apex ? v.searchClass : v.searchField} value={query} onChange={e => setQuery(e.target.value)} />
        {pivot === 'ps' && (
          <div className="row">
            {(['all', 'p', 's'] as const).map(k => (
              <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'all' ? t.matrix.quick.all : k === 'p' ? v.profiles : v.permSets}</button>
            ))}
          </div>
        )}
      </div>
      <div className="focus-list">
        {pivot === 'ps' ? sideCols.slice(0, SIDE_SHOWN).map(k => {
          const p = allPs[k]!, r = model.counts.read[k]!, e = model.counts.edit[k]!, on = k === j, c = cmp.includes(k);
          return (
            <div key={p.id} className={`pitem${on ? ' on' : ''}`}>
              <button type="button" className="pitem-main" aria-current={on || undefined} onClick={() => { setPrimary(k); setCompare(cs => cs.filter(x => x !== k)); }}>
                <span className="nm" title={`${p.label} (${p.name})`}>{lockedPs(p) ? '🔒 ' : ''}{p.label}</span>
                <span className="pmeta">{kindLabel(k)} · {apex ? t.apex.matrix.counts(r, e) : t.matrix.counts(r, e)}</span>
                {meter(r, apex ? r : e, visibleFls)}
              </button>
              {!on && (
                <button type="button" className={`cmp${c ? ' on' : ''}`} aria-pressed={c} title={c ? v.uncompare(p.label) : v.compare}
                  onClick={() => setCompare(cs => c ? cs.filter(x => x !== k) : [...cs.filter(x => columns.includes(x) && x !== j), k].slice(-MAX_COMPARE))}>{c ? `✓ ${v.comparing}` : `+ ${v.compare}`}</button>
              )}
            </div>
          );
        }) : sideFields.slice(0, SIDE_SHOWN).map(i => {
          const f = allFields[i]!, on = i === i0, r = fieldCounts?.read[i] ?? 0, e = fieldCounts?.edit[i] ?? 0;
          return (
            <div key={f.name} className={`pitem${on ? ' on' : ''}`}>
              <button type="button" className="pitem-main" aria-current={on || undefined} onClick={() => setField(i)}>
                <span className="nm" title={f.name}>{f.label}</span>
                <span className="pmeta">{f.permissionable ? (apex ? t.apex.matrix.counts(r, e) : t.matrix.counts(r, e)) : t.matrix.noFls}</span>
                {f.permissionable && meter(r, apex ? r : e, columns.length)}
              </button>
            </div>
          );
        })}
        {(pivot === 'ps' ? sideCols : sideFields).length > SIDE_SHOWN && <p className="muted small focus-more">{t.pick.more((pivot === 'ps' ? sideCols : sideFields).length - SIDE_SHOWN)}</p>}
        {!(pivot === 'ps' ? sideCols : sideFields).length && <p className="muted small focus-more">{t.pick.noResults}</p>}
      </div>
    </aside>
  );

  if (pivot === 'ps') {
    if (j === null) return <div className="focus">{side}<section className="panel empty">{v.pick}</section></div>;
    const p = allPs[j]!, locked = lockedPs(p);
    const r = model.counts.read[j]!, e = model.counts.edit[j]!;
    const rows = fields.filter(i => {
      const idx = j * F + i;
      if (only === 'diff') return cmp.some(k => cur(k * F + i) !== cur(idx));
      if (only === 'none') return allFields[i]!.permissionable && cur(idx) === 0;
      if (only === 'pending') return model.pending.has(idx);
      return true;
    });
    const selectable = rows.filter(i => model.editable(i, j));
    let last = '';
    return (
      <div className="focus">
        {side}
        <section className="panel focus-main">
          <div className="focus-h">
            <div><div className="kind">{kindLabel(j)}</div><h2>{locked ? '🔒 ' : ''}{p.label}</h2>{!p.isProfile && <div className="mono muted">{p.name}</div>}</div>
            <div className="focus-stats">{apex ? v.statsApex(r, visibleFls - r) : v.stats(r, e, visibleFls - r)}</div>
            <span className="spacer" />
            {cmp.length > 0 && !locked && (
              <button type="button" className="btn sm" onClick={() => { for (const i of fields) model.assign(i, j, cur(cmp[0]! * F + i)); done(); }}>{v.copyAll(allPs[cmp[0]!]!.label)}</button>
            )}
          </div>
          {locked ? <div className="focus-bulk">{v.lockedPs}</div> : (
            <div className="focus-bulk">
              <span>{v.selected(sel.size)}</span>
              <span className="muted">{v.set}</span>
              <Levels model={model} levels={apex ? [0, 1] : [0, 1, 2]} value={null} disabled={!sel.size} label={v.set}
                onPick={x => { for (const i of sel) model.assign(i, j, x); done(); }} />
              <span className="spacer" />
              {(['all', 'diff', 'none', 'pending'] as const).map(o => (
                <button key={o} type="button" className="chip" aria-pressed={only === o} disabled={o === 'diff' && !cmp.length} onClick={() => setOnly(o)}>{v.only[o]}</button>
              ))}
            </div>
          )}
          <div className="tbl-wrap">
            <table className="flist">
              <thead><tr>
                <th className="ck"><input type="checkbox" id="focus-all" aria-label={v.selectAll} disabled={locked || !selectable.length}
                  checked={selectable.length > 0 && selectable.every(i => sel.has(i))} onChange={e => setSel(e.target.checked ? new Set(selectable) : new Set())} /></th>
                <th>{apex ? t.apex.matrix.field : t.matrix.field}</th>
                <th>{v.access}</th>
                {cmp.map(k => (
                  <th key={k} className="cmpcell" title={allPs[k]!.label}><span className="cmp-h">{allPs[k]!.label}</span>
                    <button type="button" className="btn sm cmp-x" aria-label={v.uncompare(allPs[k]!.label)} onClick={() => setCompare(cs => cs.filter(x => x !== k))}>×</button></th>
                ))}
              </tr></thead>
              <tbody>
                {rows.slice(0, shown).map(i => {
                  const f = allFields[i]!, idx = j * F + i, x = cur(idx), pend = model.pending.has(idx);
                  const group = !apex && f.object !== last ? <tr className="grp" key={`g-${f.object}`}><td colSpan={3 + cmp.length}>{f.object}</td></tr> : null;
                  last = f.object;
                  return [group, (
                    <tr key={f.name} className={pend ? 'pend' : ''}>
                      <td className="ck"><input type="checkbox" aria-label={f.label} checked={sel.has(i)} disabled={!model.editable(i, j)} onChange={() => toggleSel(i)} /></td>
                      <td><div className="fl">{f.label}{f.custom && !apex && <span className="tag">custom</span>}{f.calculated && <span className="tag">{t.matrix.readOnly}</span>}{f.encrypted && <span className="tag sens">{t.matrix.encrypted}</span>}</div>
                        {!apex && <div className="api">{f.name}</div>}</td>
                      <td>{f.permissionable
                        ? <><Levels model={model} levels={levelsFor(apex, f)} value={x} pending={pend} disabled={locked} label={`${p.label} · ${f.label}`}
                            onPick={y => { model.assign(i, j, y); model.commit(); }} />
                          {pend && <span className="was">{t.matrix.was(long[model.base[idx]!]!)}</span>}</>
                        : <span className="muted small">{v.noFls}</span>}</td>
                      {cmp.map(k => {
                        const w = cur(k * F + i);
                        return (
                          <td key={k} className="cmpcell">{f.permissionable
                            ? <button type="button" className="cmp-copy" disabled={locked || w === x} title={v.copyOne(long[w]!, allPs[k]!.label)}
                                onClick={() => { model.assign(i, j, w); model.commit(); }}><span className={`acc v${w}${w !== x ? ' diff' : ''}`}>{short[w]}</span></button>
                            : <span className="muted">—</span>}</td>
                        );
                      })}
                    </tr>
                  )];
                })}
                {!rows.length && <tr><td colSpan={3 + cmp.length} className="muted">{t.pick.noResults}</td></tr>}
              </tbody>
            </table>
          </div>
          {rows.length > shown && <div className="focus-more"><button type="button" className="btn sm" onClick={() => setShown(s => s + MAIN_STEP)}>{v.more(Math.min(MAIN_STEP, rows.length - shown))}</button></div>}
        </section>
      </div>
    );
  }

  if (i0 === null) return <div className="focus">{side}<section className="panel empty">{v.pickField}</section></div>;
  const f = allFields[i0]!;
  const list = [true, false].map(isP => ({ isP, cols: columns.filter(k => allPs[k]!.isProfile === isP) })).filter(g => g.cols.length);
  const selectable = columns.filter(k => model.editable(i0, k));
  let count = 0;
  return (
    <div className="focus">
      {side}
      <section className="panel focus-main">
        <div className="focus-h">
          <div>{!apex && <div className="kind">{f.object} · {f.type}</div>}<h2>{f.label}</h2>{!apex && <div className="mono muted">{f.name}</div>}</div>
          {f.permissionable && <div className="focus-stats">{(() => {
            let r = 0, e = 0; for (const k of columns) { const x = cur(k * F + i0); if (x) r++; if (x === 2) e++; }
            return apex ? v.statsApex(r, columns.length - r) : v.stats(r, e, columns.length - r);
          })()}</div>}
        </div>
        {!f.permissionable ? <div className="focus-bulk">{t.matrix.alwaysTitle}</div> : (
          <div className="focus-bulk">
            <span>{v.selected(sel.size)}</span>
            <span className="muted">{v.set}</span>
            <Levels model={model} levels={levelsFor(apex, f)} value={null} disabled={!sel.size} label={v.set}
              onPick={x => { for (const k of sel) model.assign(i0, k, x); done(); }} />
          </div>
        )}
        <div className="tbl-wrap">
          <table className="flist">
            <thead><tr>
              <th className="ck"><input type="checkbox" id="focus-all" aria-label={v.selectAll} disabled={!selectable.length}
                checked={selectable.length > 0 && selectable.every(k => sel.has(k))} onChange={e => setSel(e.target.checked ? new Set(selectable) : new Set())} /></th>
              <th>{t.matrix.profilesAndPs}</th><th>{v.access}</th>
            </tr></thead>
            <tbody>
              {list.map(g => [
                <tr className="grp" key={`g-${g.isP}`}><td colSpan={3}>{g.isP ? v.profiles : v.permSets}</td></tr>,
                ...g.cols.filter(() => count++ < shown).map(k => {
                  const p = allPs[k]!, idx = k * F + i0, x = cur(idx), pend = model.pending.has(idx);
                  return (
                    <tr key={p.id} className={pend ? 'pend' : ''}>
                      <td className="ck"><input type="checkbox" aria-label={p.label} checked={sel.has(k)} disabled={!model.editable(i0, k)} onChange={() => toggleSel(k)} /></td>
                      <td><div className="fl">{lockedPs(p) ? '🔒 ' : ''}{p.label}</div>{!p.isProfile && <div className="api">{p.name}</div>}</td>
                      <td>{f.permissionable
                        ? <><Levels model={model} levels={levelsFor(apex, f)} value={x} pending={pend} disabled={!model.editable(i0, k)} label={`${p.label} · ${f.label}`}
                            onPick={y => { model.assign(i0, k, y); model.commit(); }} />
                          {pend && <span className="was">{t.matrix.was(long[model.base[idx]!]!)}</span>}</>
                        : <span className="muted small">{v.noFls}</span>}</td>
                    </tr>
                  );
                })
              ])}
            </tbody>
          </table>
        </div>
        {columns.length > shown && <div className="focus-more"><button type="button" className="btn sm" onClick={() => setShown(s => s + MAIN_STEP)}>{v.more(Math.min(MAIN_STEP, columns.length - shown))}</button></div>}
      </section>
    </div>
  );
}
