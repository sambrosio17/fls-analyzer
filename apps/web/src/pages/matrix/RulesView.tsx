import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../i18n.tsx';
import type { Access } from '../../api.ts';
import { MultiPick, type PickOption } from '../../MultiPick.tsx';
import { lockedPs, type MatrixModel } from './model.ts';

type Action = 'none' | 'read' | 'edit' | 'removeEdit' | 'copy';
interface Rule { action: Action; from: number | null; fields: string[]; ps: string[] }
interface Queued { text: string; count: number; undo: [number, Access | undefined][] }
const SHOWN = 100;

/** The value a rule gives a cell that has `v` now; "grant read" never takes edit away. */
function ruleTarget(action: Action, v: Access, from: Access): Access {
  if (action === 'read') return v === 2 ? 2 : 1;
  if (action === 'edit') return 2;
  if (action === 'none') return 0;
  if (action === 'removeEdit') return v === 2 ? 1 : v;
  return from;
}

/**
 * Bulk changes written as a sentence: an action, the fields and the profiles. It shows how many cells change
 * before adding them; each added rule lands in the pending changes and can be taken back.
 */
export function RulesView({ model }: { model: MatrixModel }) {
  const t = useT();
  const r = t.views.rules;
  const { allFields, allPs, F, fields, columns, cur, apex } = model;
  const short = apex ? t.apex.access.short : t.access.short;
  const [rule, setRule] = useState<Rule>({ action: apex ? 'read' : 'edit', from: null, fields: [], ps: [] });
  const [queue, setQueue] = useState<Queued[]>([]);
  // Discarding the pending changes empties the list too.
  useEffect(() => { if (!model.pending.size) setQueue([]); }, [model.pending.size === 0]);

  const fieldOptions = useMemo<PickOption[]>(() => fields.map(i => ({ id: allFields[i]!.name, label: allFields[i]!.label, sub: apex ? undefined : allFields[i]!.name })), [fields]);
  const psOptions = useMemo<PickOption[]>(() => columns.map(j => ({ id: allPs[j]!.id, label: allPs[j]!.label, sub: allPs[j]!.isProfile ? t.matrix.profileSub : allPs[j]!.name })), [columns, t]);
  const pickedFields = useMemo(() => { const s = new Set(rule.fields); return s.size ? fields.filter(i => s.has(allFields[i]!.name)) : fields; }, [rule.fields, fields]);
  const pickedPs = useMemo(() => { const s = new Set(rule.ps); return s.size ? columns.filter(j => s.has(allPs[j]!.id)) : columns; }, [rule.ps, columns]);
  const from = rule.action === 'copy' ? (rule.from !== null && columns.includes(rule.from) ? rule.from : null) : null;

  const diff = useMemo(() => {
    const out: { i: number; j: number; v: Access; to: Access }[] = [];
    let skipped = 0;
    if (rule.action === 'copy' && from === null) return { out, skipped };
    for (const j of pickedPs) {
      if (j === from) continue;
      for (const i of pickedFields) {
        const f = allFields[i]!;
        if (!f.permissionable) continue;
        if (!model.editable(i, j)) { skipped++; continue; }
        const v = cur(j * F + i);
        let to = ruleTarget(rule.action, v, from === null ? 0 : cur(from * F + i));
        if ((f.calculated || apex) && to === 2) to = 1;
        if (to !== v) out.push({ i, j, v, to });
      }
    }
    return { out, skipped };
  }, [rule, pickedFields, pickedPs, from, model.rev]);
  const up = diff.out.filter(x => x.to > x.v).length;

  const actions: Action[] = apex ? ['read', 'none', 'copy'] : ['edit', 'read', 'removeEdit', 'none', 'copy'];
  const actionLabel = (a: Action) => apex ? (a === 'read' ? t.apex.bulk.enable : a === 'none' ? t.apex.bulk.disable : r.actions.copy) : r.actions[a];
  const fieldsText = rule.fields.length ? r.someFields(pickedFields.length, apex) : r.allFields(pickedFields.length, apex);
  const psText = rule.ps.length ? r.somePs(pickedPs.length) : r.allPs(pickedPs.length);

  const add = () => {
    const undo: Queued['undo'] = [];
    for (const d of diff.out) { const idx = d.j * F + d.i; undo.push([idx, model.pending.get(idx)]); model.assign(d.i, d.j, d.to); }
    model.commit();
    const what = rule.action === 'copy' ? `${actionLabel('copy')} ${allPs[from!]!.label}` : actionLabel(rule.action);
    setQueue(q => [...q, { text: r.sentence(what, fieldsText, psText), count: diff.out.length, undo }]);
  };
  const remove = (n: number) => {
    const q = queue[n]!;
    for (const [idx, v] of [...q.undo].reverse()) model.restore(idx, v);
    model.commit();
    setQueue(queue.filter((_, k) => k !== n));
  };
  const recipe = (k: 'clone' | 'encrypted' | 'custom' | 'package') => {
    if (k === 'clone') setRule({ action: 'copy', from: from ?? columns.find(j => allPs[j]!.isProfile) ?? null, fields: [], ps: [] });
    if (k === 'encrypted') setRule({ action: 'removeEdit', from: null, fields: fields.filter(i => allFields[i]!.encrypted).map(i => allFields[i]!.name), ps: [] });
    if (k === 'custom') setRule({ action: 'read', from: null, fields: fields.filter(i => allFields[i]!.custom && allFields[i]!.permissionable).map(i => allFields[i]!.name), ps: [] });
    if (k === 'package') setRule({ action: 'none', from: null, fields: fields.filter(i => !allFields[i]!.custom).map(i => allFields[i]!.name), ps: [] });
  };

  return (
    <div className="rules">
      <section className="panel">
        <div className="rule-sentence">
          <select className="input tok" id="rule-action" aria-label={r.action} value={rule.action} onChange={e => setRule({ ...rule, action: e.target.value as Action })}>
            {actions.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>
          {rule.action === 'copy' && (
            <select className="input tok" id="rule-from" aria-label={r.from} value={from ?? ''} onChange={e => setRule({ ...rule, from: e.target.value === '' ? null : Number(e.target.value) })}>
              <option value="">{r.from}</option>
              {columns.map(j => <option key={j} value={j}>{allPs[j]!.label}{allPs[j]!.isProfile ? ` (${t.matrix.profileSub})` : ''}</option>)}
            </select>
          )}
          <span>{rule.action === 'copy' ? r.forWord : r.onWord}</span>
          <span className="tok-pick"><MultiPick id="rule-fields" label={apex ? t.apex.matrix.fields : t.matrix.fields} options={fieldOptions} selected={rule.fields} onChange={x => setRule({ ...rule, fields: x })} /></span>
          <span>{rule.action === 'copy' ? r.toWordCopy : r.toWord}</span>
          <span className="tok-pick"><MultiPick id="rule-ps" label={t.matrix.profilesAndPs} options={psOptions} selected={rule.ps} onChange={x => setRule({ ...rule, ps: x })} /></span>
        </div>
        <p className="muted small rule-read">{r.reads(rule.action === 'copy' ? `${actionLabel('copy')} ${from === null ? '…' : allPs[from]!.label}` : actionLabel(rule.action), fieldsText, psText)}</p>
        <div className="row rule-recipes">
          <span className="muted small">{r.recipes}</span>
          <button type="button" className="chip" onClick={() => recipe('clone')}>{r.recipeClone}</button>
          {!apex && <button type="button" className="chip" onClick={() => recipe('encrypted')}>{r.recipeEncrypted}</button>}
          {!apex && <button type="button" className="chip" onClick={() => recipe('custom')}>{r.recipeCustom}</button>}
          {apex && <button type="button" className="chip" onClick={() => recipe('package')}>{r.recipePackage}</button>}
        </div>
        <div className="rule-impact">
          <div><b className="big">{diff.out.length.toLocaleString(t.locale)}</b><span className="muted small">{r.changes}</span></div>
          <div><b className="big up">+{up.toLocaleString(t.locale)}</b><span className="muted small">{r.more}</span></div>
          <div><b className="big down">−{(diff.out.length - up).toLocaleString(t.locale)}</b><span className="muted small">{r.less}</span></div>
          {diff.skipped > 0 && <span className="muted small">🔒 {r.skipped(diff.skipped)}</span>}
          <span className="spacer" />
          <button type="button" className="btn primary" id="rule-add" disabled={!diff.out.length} onClick={add}>{r.add}</button>
        </div>
        <div className="tbl-wrap rule-diff">
          <table className="dt">
            <thead><tr>{r.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {diff.out.slice(0, SHOWN).map(d => (
                <tr key={`${d.i}-${d.j}`}>
                  <td>{allFields[d.i]!.label}{!apex && <span className="mono muted"> {allFields[d.i]!.object}</span>}</td>
                  <td>{lockedPs(allPs[d.j]!) ? '🔒 ' : ''}{allPs[d.j]!.label}</td>
                  <td><span className={`acc v${d.v}`}>{short[d.v]}</span></td>
                  <td><span className={`acc v${d.to} pend`}>{short[d.to]}</span></td>
                </tr>
              ))}
              {!diff.out.length && <tr><td colSpan={4} className="muted">{rule.action === 'copy' && from === null ? r.pickFrom : r.nothing}</td></tr>}
              {diff.out.length > SHOWN && <tr><td colSpan={4} className="muted">{r.andMore(diff.out.length - SHOWN)}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel rule-queue">
        <div className="panel-h"><h2>{r.queue}</h2></div>
        <ol>
          {queue.map((q, n) => (
            <li key={n}><span className="num">{n + 1}</span><span>{q.text}<br /><span className="muted small">{r.cells(q.count)}</span></span>
              {n === queue.length - 1 ? <button type="button" className="btn sm" onClick={() => remove(n)}>{r.remove}</button> : <span />}</li>
          ))}
        </ol>
        {!queue.length && <p className="muted small rule-empty">{r.queueEmpty}</p>}
        <p className="muted small rule-empty">{r.queueNote}</p>
      </section>
    </div>
  );
}
