import { useEffect, useState } from 'react';
import { beginLoad, useTabId } from '../loads.ts';
import { api, type ChangeSet, type Status } from '../api.ts';
import { useT } from '../i18n.tsx';
import { ExportMenu } from '../export/ExportMenu.tsx';
import { CSV_TYPE, XLSX_TYPE, download, slug, toCsv, toXlsx, type Sheet } from '../export/table.ts';

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
  const count = (op: string) => items.filter(i => i.op === op).length;
  const failed = items.filter(i => i.status === 'error' || i.status === 'conflict');
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
  const sheet = (): Sheet => ({
    name: t.export.sheetChanges,
    rows: [
      [...t.changeSet.cols, t.export.warnings, t.export.error],
      ...shown.map(i => [i.parentLabel, name(i), acc(i).long[i.before]!, acc(i).long[i.after]!, i.op, t.changeSet.item[i.status] ?? i.status,
        i.warnings.map(w => t.warning[w] ?? w).join(' '), i.errorMessage ? `${i.errorCode ?? ''} ${i.errorMessage}`.trim() : null])
    ]
  });
  const fileName = (ext: string) => `orgsmith-${cs.number}-${slug(cs.org.label)}.${ext}`;

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
          <ExportMenu note={t.export.rowsScope(shown.length)} items={[
            { id: 'xlsx', label: t.export.excel, run: async p => download(fileName('xlsx'), await toXlsx([sheet()], p), XLSX_TYPE) },
            { id: 'csv', label: t.export.csv, run: async p => download(fileName('csv'), await toCsv(sheet().rows, t.locale, p), CSV_TYPE) }
          ]} />
          <button className="btn" onClick={onBack}>{t.common.close}</button>
        </div>
      </div>
      {error && <div className="banner prod">{error}</div>}
      {notice && <div className="banner info">{notice}</div>}

      <div className="kpis">
        <div className="kpi"><div className="k">{t.changeSet.kpiChanges}</div><div className="n">{items.length}</div></div>
        <div className="kpi good"><div className="k">{t.changeSet.kpiNew}</div><div className="n">{count('insert')}</div></div>
        <div className="kpi"><div className="k">{t.changeSet.kpiChanged}</div><div className="n">{count('update')}</div></div>
        <div className="kpi bad"><div className="k">{t.changeSet.kpiRemoved}</div><div className="n">{count('delete')}</div></div>
        {finished
          ? <div className="kpi bad"><div className="k">{t.changeSet.kpiFailed}</div><div className="n">{failed.length}</div></div>
          : <div className="kpi warn"><div className="k">{t.changeSet.kpiWarnings}</div><div className="n">{items.filter(i => i.warnings.length).length}</div></div>}
      </div>

      <div className="prev-grid">
        <section className="panel" style={{ minWidth: 0 }}>
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
        </section>

        <aside className="stack">
          {Object.keys(skippedByReason).length > 0 && (
            <section className="panel"><div className="panel-h"><h2>{t.changeSet.skipped}</h2></div>
              <ul className="panel-b plain">{Object.entries(skippedByReason).map(([r, n]) => <li key={r}><b>{n}</b> {t.skip[r] ?? r}</li>)}</ul>
            </section>
          )}

          <section className="panel">
            <div className="panel-h"><h2>{prod ? t.changeSet.approval : t.changeSet.confirmation}</h2>{prod && <span className="env prod">{t.changeSet.twoStep}</span>}</div>
            <div className="panel-b stack">
              {cs.status === 'draft' && items.length === 0 && <p className="muted">{t.changeSet.nothing}</p>}
              {cs.status === 'draft' && items.length > 0 && prod && (
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
              {((cs.status === 'draft' && !prod && items.length > 0) || cs.status === 'approved') && (
                <>
                  {prod && (
                    <label className="field"><span>{t.changeSet.typeToConfirm(cs.org.label)}</span>
                      <input className="input" id="confirm-name" value={confirmName} onChange={e => setConfirmName(e.target.value)} />
                    </label>
                  )}
                  <label className="check"><input type="checkbox" id="reviewed" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />{t.changeSet.reviewed(items.length)}</label>
                  <button className="btn primary" disabled={!canRun || busy} onClick={() => act(() => api.execute(cs.id, prod ? confirmName : undefined))}>{t.changeSet.apply(items.length)}</button>
                </>
              )}
              {cs.status === 'running' && <p>{t.changeSet.running}</p>}
              {cs.status === 'rejected' && <p className="muted">{t.changeSet.rejected}</p>}
              {finished && (
                <>
                  <p>{cs.status === 'done' ? t.changeSet.allDone : t.changeSet.partial(items.length - failed.length, failed.length)}</p>
                  {items.some(i => i.status === 'ok') && (
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
