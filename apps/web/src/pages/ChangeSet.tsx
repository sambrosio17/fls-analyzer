import { useEffect, useState } from 'react';
import { beginLoad, useTabId } from '../loads.ts';
import { api, type AssignmentItem, type ChangeSet, type Status } from '../api.ts';
import { useT } from '../i18n.tsx';
import { ExportMenu } from '../export/ExportMenu.tsx';
import { CSV_TYPE, XLSX_TYPE, download, slug, toCsv, toXlsx, type Sheet } from '../export/table.ts';
import { metadataBundle, type MetaFile } from '../export/metadata.ts';
import { zip } from '../export/zip.ts';
import { part, type Progress } from '../export/progress.ts';

const STATUS_CLASS: Record<Status, string> = {
  draft: '', pending_approval: 'st-part', approved: 'st-info', rejected: 'st-err', running: 'st-info', done: 'st-ok', partial: 'st-part', failed: 'st-err'
};

interface Props { id: string; onOpen: (id: string, number: string) => void; onBack: () => void }

/** Rows rendered at once in the detail table; big change sets render on demand. */
const PAGE = 250;

export function ChangeSetPage({ id, onOpen, onBack }: Props) {
  const t = useT();
  const [cs, setCs] = useState<ChangeSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [opFilter, setOpFilter] = useState<'all' | 'insert' | 'update' | 'delete' | 'warn' | 'failed'>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const tabId = useTabId();
  const running = cs?.status === 'running';
  // A change set keeps running on the server; if the user leaves the tab, a notice says when it ends.
  useEffect(() => {
    if (!running || !tabId) return;
    const end = beginLoad(tabId, 'run');
    return () => end();
  }, [running, tabId]);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => { api.changeSet(id).then(setCs).catch(e => setError(e.message)); }, [id]);
  useEffect(() => {
    if (cs?.status !== 'running') return;
    const t = setInterval(() => api.changeSet(id).then(setCs), 1500);
    return () => clearInterval(t);
  }, [id, cs?.status]);

  if (error && !cs) return <div className="banner prod">{error}</div>;
  if (!cs) return <p className="muted">{t.common.loading}</p>;

  const act = async (fn: () => Promise<ChangeSet>, after?: (r: ChangeSet) => void) => {
    setBusy(true); setError(null);
    try { const r = await fn(); after ? after(r) : setCs(r); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const items = cs.items;
  const assign = cs.kind === 'assignments';
  /** Rows of either kind: field and Apex access, or layout and page assignments. */
  const rows: { status: string }[] = assign ? cs.assignments : items;
  const total = rows.length;
  const count = (op: string) => items.filter(i => i.op === op).length;
  const failed = rows.filter(i => i.status === 'error' || i.status === 'conflict');
  const shown = items.filter(i =>
    opFilter === 'all' ? true : opFilter === 'warn' ? i.warnings.length > 0 : opFilter === 'failed' ? i.status === 'error' || i.status === 'conflict' : i.op === opFilter);
  const skippedByReason = cs.skipped.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.reason]: (acc[s.reason] ?? 0) + 1 }), {});
  const finished = ['done', 'partial', 'failed'].includes(cs.status);
  const prod = cs.requiresApproval;
  const canRun = reviewed && (!prod || confirmName.trim() === cs.org.label);
  // Apex class rows: enabled or disabled, named without the pseudo-object prefix.
  const isApex = (i: { sobjectType: string }) => i.sobjectType === 'ApexClass';
  const acc = (i: { sobjectType: string }) => isApex(i) ? t.apex.access : t.access;
  const name = (i: { field: string; sobjectType: string }) => isApex(i) ? i.field.slice('ApexClass.'.length) : i.field;
  const sheet = (): Sheet => assign ? assignmentSheet(t, cs.assignments) : ({
    name: t.export.sheetChanges,
    rows: [
      [...t.changeSet.cols, t.export.warnings, t.export.error],
      ...shown.map(i => [i.parentLabel, name(i), acc(i).long[i.before]!, acc(i).long[i.after]!, i.op, t.changeSet.item[i.status] ?? i.status,
        i.warnings.map(w => t.warning[w] ?? w).join(' '), i.errorMessage ? `${i.errorCode ?? ''} ${i.errorMessage}`.trim() : null])
    ]
  });
  const fileName = (ext: string) => `orgsmith-${cs.number}-${slug(cs.org.label)}.${ext}`;
  // The values this change set sets, as profile and permission set files ready to deploy or keep in Git.
  const exportMetadata = async (p: Progress) => {
    await p(0, 'collect');
    const [sets, profileNames] = await Promise.all([api.permissionSets(cs.org.id), api.profileNames(cs.org.id)]);
    const byId = new Map(sets.map(s => [s.id, s]));
    const files = new Map<string, MetaFile>();
    let noName = 0;
    for (const i of items) {
      const ps = byId.get(i.parentId);
      const fullName = ps?.isProfile ? profileNames[i.parentId] : ps?.name;
      if (!fullName) { noName++; continue; }
      const kind = ps!.isProfile ? 'Profile' : 'PermissionSet';
      const f = files.get(i.parentId) ?? files.set(i.parentId, { kind, fullName, entries: [] }).get(i.parentId)!;
      f.entries.push({ name: i.field, access: i.after });
    }
    if (!files.size) return t.export.nothing;
    await p(0.3, 'write');
    download(fileName('zip'), await zip(metadataBundle([...files.values()]), part(p, 0.4, 1, 'compress')), 'application/zip');
    return noName ? t.export.leftOutRows(noName) : undefined;
  };

  return (
    <>
      <div className="view-head">
        <div>
          <div className="eyebrow">{cs.number} · {cs.org.label}</div>
          <h1>{finished ? t.changeSet.result : t.changeSet.preview} <span className={`pill ${STATUS_CLASS[cs.status]}`}>{t.status[cs.status]}</span></h1>
          <p>{cs.description}{cs.rollbackOf && t.changeSet.undoes}</p>
        </div>
        <span className="spacer" />
        <div className="row">
          <ExportMenu note={t.export.rowsScope(assign ? total : shown.length)} items={[
            { id: 'xlsx', label: t.export.excel, run: async p => download(fileName('xlsx'), await toXlsx([sheet()], p), XLSX_TYPE) },
            { id: 'csv', label: t.export.csv, run: async p => download(fileName('csv'), await toCsv(sheet().rows, t.locale, p), CSV_TYPE) },
            ...(assign ? [] : [{ id: 'metadata', label: t.export.metadata, hint: t.export.metadataChangeSetHint, run: exportMetadata }])
          ]} />
          <button className="btn" onClick={onBack}>{t.common.close}</button>
        </div>
      </div>
      {error && <div className="banner prod">{error}</div>}
      {notice && <div className="banner info">{notice}</div>}

      {assign ? <AssignmentView items={cs.assignments} finished={finished} timings={cs.timings} /> : <>
      <div className="kpis">
        <div className="kpi"><div className="k">{t.changeSet.kpiChanges}</div><div className="n">{items.length}</div></div>
        <div className="kpi good"><div className="k">{t.changeSet.kpiNew}</div><div className="n">{count('insert')}</div></div>
        <div className="kpi"><div className="k">{t.changeSet.kpiChanged}</div><div className="n">{count('update')}</div></div>
        <div className="kpi bad"><div className="k">{t.changeSet.kpiRemoved}</div><div className="n">{count('delete')}</div></div>
        {finished
          ? <div className="kpi bad"><div className="k">{t.changeSet.kpiFailed}</div><div className="n">{failed.length}</div></div>
          : <div className="kpi warn"><div className="k">{t.changeSet.kpiWarnings}</div><div className="n">{items.filter(i => i.warnings.length).length}</div></div>}
      </div>

      </>}

      <div className={`prev-grid${assign ? ' solo' : ''}`}>
        {!assign && <section className="panel" style={{ minWidth: 0 }}>
          <div className="panel-h"><h2>{t.changeSet.detail}</h2>
            <div className="row">
              {(['all', 'insert', 'update', 'delete', 'warn', ...(finished ? ['failed'] : [])] as (typeof opFilter)[]).map(f => [f, t.changeSet.filters[f]] as const).map(([f, l]) => (
                <button key={f} className="chip" aria-pressed={opFilter === f} onClick={() => { setOpFilter(f); setLimit(PAGE); }}>{l}</button>
              ))}
            </div>
          </div>
          <div className="tbl-wrap">
            <table className="dt">
              <thead><tr>{t.changeSet.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {shown.slice(0, limit).map(i => (
                  <tr key={i.id}>
                    <td>{i.parentLabel}</td>
                    <td>{isApex(i) && <span className="tag">Apex</span>} <span className="mono">{name(i)}</span>
                      {i.warnings.map(w => <div className="warn-text" key={w}>⚠ {t.warning[w] ?? w}</div>)}
                      {i.errorMessage && <div className="err-text"><span className="mono">{i.errorCode}</span> {i.errorMessage}</div>}
                    </td>
                    <td className="mono">{acc(i).short[i.before]}</td>
                    <td className="mono"><b>{acc(i).short[i.after]}</b></td>
                    <td><span className={`pill op-${i.op}`}>{i.op}</span></td>
                    <td><span className={`pill ${i.status === 'ok' ? 'st-ok' : i.status === 'pending' ? '' : 'st-err'}`}>{t.changeSet.item[i.status]}</span></td>
                  </tr>
                ))}
                {!shown.length && <tr><td colSpan={6} className="muted">{t.changeSet.noRows}</td></tr>}
                {shown.length > limit && (
                  <tr><td colSpan={6}><span className="muted">{t.changeSet.shown(limit, shown.length)}</span> <button className="btn sm" onClick={() => setLimit(l => l + PAGE * 4)}>{t.changeSet.showMore}</button></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>}

        <aside className="stack">
          {Object.keys(skippedByReason).length > 0 && (
            <section className="panel"><div className="panel-h"><h2>{t.changeSet.skipped}</h2></div>
              <ul className="panel-b plain">{Object.entries(skippedByReason).map(([r, n]) => <li key={r}><b>{n}</b> {t.skip[r] ?? r}</li>)}</ul>
            </section>
          )}

          <section className="panel">
            <div className="panel-h"><h2>{prod ? t.changeSet.approval : t.changeSet.confirmation}</h2>{prod && <span className="env prod">{t.changeSet.twoStep}</span>}</div>
            <div className="panel-b stack">
              {cs.status === 'draft' && total === 0 && <p className="muted">{t.changeSet.nothing}</p>}
              {cs.status === 'draft' && total > 0 && prod && (
                <>
                  <p className="muted">{t.changeSet.prodNeedsApproval}</p>
                  <button className="btn primary" disabled={busy} onClick={() => act(() => api.submit(cs.id))}>{t.changeSet.submit}</button>
                </>
              )}
              {cs.status === 'pending_approval' && (
                <>
                  <p className="muted">{t.changeSet.submittedAt(new Date(cs.submittedAt!).toLocaleString(t.locale))}</p>
                  <div className="row">
                    <button className="btn danger" disabled={busy} onClick={() => act(() => api.reject(cs.id))}>{t.changeSet.reject}</button>
                    <button className="btn primary" disabled={busy} onClick={() => act(() => api.approve(cs.id), r => {
                      setCs(r);
                      setNotice(r.conflicts ? t.changeSet.conflicts(r.conflicts) : t.changeSet.noConflicts);
                    })}>{t.changeSet.approve}</button>
                  </div>
                </>
              )}
              {((cs.status === 'draft' && !prod && total > 0) || cs.status === 'approved') && (
                <>
                  {prod && (
                    <label className="field"><span>{t.changeSet.typeToConfirm(cs.org.label)}</span>
                      <input className="input" id="confirm-name" value={confirmName} onChange={e => setConfirmName(e.target.value)} />
                    </label>
                  )}
                  <label className="check"><input type="checkbox" id="reviewed" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />{t.changeSet.reviewed(total)}</label>
                  <button className="btn primary" disabled={!canRun || busy} onClick={() => act(() => api.execute(cs.id, prod ? confirmName : undefined))}>{t.changeSet.apply(total)}</button>
                </>
              )}
              {cs.status === 'running' && <p>{t.changeSet.running}</p>}
              {cs.status === 'rejected' && <p className="muted">{t.changeSet.rejected}</p>}
              {finished && (
                <>
                  <p>{cs.status === 'done' ? t.changeSet.allDone : t.changeSet.partial(total - failed.length, failed.length)}</p>
                  {rows.some(i => i.status === 'ok') && (
                    <button className="btn" disabled={busy} onClick={() => act(() => api.rollback(cs.id), r => onOpen(r.id, r.number))}>{t.changeSet.rollback}</button>
                  )}
                </>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

type T = ReturnType<typeof useT>;
const assignmentValue = (t: T, a: AssignmentItem, v: string | null) => v ?? (a.kind === 'page' ? t.changeSet.assign.defaultPage : '—');

function assignmentSheet(t: T, items: AssignmentItem[]): Sheet {
  return {
    name: t.export.sheetChanges,
    rows: [
      [...t.changeSet.assign.cols, t.export.error],
      ...items.map(a => [t.changeSet.assign.kind[a.kind], a.object, a.app && a.formFactor ? `${a.app} · ${t.layouts.formFactor[a.formFactor]}` : a.app, a.profileLabel, a.recordType ?? t.changeSet.assign.master,
        assignmentValue(t, a, a.before), assignmentValue(t, a, a.after), t.changeSet.item[a.status] ?? a.status,
        a.errorMessage ? `${a.errorCode ?? ''} ${a.errorMessage}`.trim() : null])
    ]
  };
}

/** Page layout and Lightning page assignments: who sees which layout or page, before and after. */
function AssignmentView({ items, finished, timings }: { items: AssignmentItem[]; finished: boolean; timings: ChangeSet['timings'] }) {
  const t = useT();
  const a = t.changeSet.assign;
  const [filter, setFilter] = useState<'all' | 'layout' | 'page' | 'failed'>('all');
  const failed = (i: AssignmentItem) => i.status === 'error' || i.status === 'conflict';
  const shown = items.filter(i => filter === 'all' ? true : filter === 'failed' ? failed(i) : i.kind === filter);
  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="k">{t.changeSet.kpiChanges}</div><div className="n">{items.length}</div></div>
        <div className="kpi"><div className="k">{a.kind.layout}</div><div className="n">{items.filter(i => i.kind === 'layout').length}</div></div>
        <div className="kpi"><div className="k">{a.kind.page}</div><div className="n">{items.filter(i => i.kind === 'page').length}</div></div>
        <div className="kpi warn"><div className="k">{a.kpiCleared}</div><div className="n">{items.filter(i => i.kind === 'page' && !i.after).length}</div></div>
        {finished && <div className="kpi bad"><div className="k">{t.changeSet.kpiFailed}</div><div className="n">{items.filter(failed).length}</div></div>}
      </div>
      <section className="panel" style={{ minWidth: 0, marginBottom: 16 }}>
        <div className="panel-h"><h2>{t.changeSet.detail}</h2>
          <div className="row">
            {(['all', 'layout', 'page', ...(finished ? ['failed'] : [])] as (typeof filter)[]).map(f => (
              <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === 'all' || f === 'failed' ? t.changeSet.filters[f] : a.kind[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="dt">
            <thead><tr>{a.cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {shown.map(i => (
                <tr key={i.id}>
                  <td><span className="tag">{a.kind[i.kind]}</span></td>
                  <td className="mono">{i.object}</td>
                  <td>{i.app ?? <span className="muted">—</span>}{i.formFactor && <div className="muted small">{t.layouts.formFactor[i.formFactor]}</div>}</td>
                  <td>{i.profileLabel}</td>
                  <td>{i.recordType ?? <span className="muted">{a.master}</span>}</td>
                  <td>{i.before ? i.before : <span className="muted">{assignmentValue(t, i, null)}</span>}</td>
                  <td><b>{i.after ? i.after : <span className="muted">{assignmentValue(t, i, null)}</span>}</b>
                    {i.errorMessage && <div className="err-text"><span className="mono">{i.errorCode}</span> {i.errorMessage}</div>}
                  </td>
                  <td><span className={`pill ${i.status === 'ok' ? 'st-ok' : i.status === 'pending' ? '' : 'st-err'}`}>{t.changeSet.item[i.status]}</span></td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={8} className="muted">{t.changeSet.noRows}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {timings && timings.length > 0 && <Timings steps={timings} />}
    </>
  );
}

/** How long each step of an assignment run took, summed per step. */
function Timings({ steps }: { steps: { step: string; ms: number }[] }) {
  const t = useT();
  const tm = t.changeSet.timing;
  const sums = [...steps.reduce((m, s) => m.set(s.step, { ms: (m.get(s.step)?.ms ?? 0) + s.ms, n: (m.get(s.step)?.n ?? 0) + 1 }), new Map<string, { ms: number; n: number }>())];
  const total = steps.reduce((a, s) => a + s.ms, 0);
  const sec = (ms: number) => `${(ms / 1000).toLocaleString(t.locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} s`;
  return (
    <section className="panel" style={{ marginBottom: 16 }} id="timings">
      <div className="panel-h"><h2>{tm.title}</h2><span className="muted">{sec(total)}</span></div>
      <div className="panel-b">
        <ul className="plain">
          {sums.map(([step, v]) => <li key={step}><b>{sec(v.ms)}</b> {tm.steps[step] ?? step}{tm.times(v.n)}</li>)}
        </ul>
        <p className="muted small">{tm.note}</p>
      </div>
    </section>
  );
}
