import { useEffect, useState } from 'react';
import { ACCESS_SHORT, SKIP_LABEL, STATUS_LABEL, WARNING_LABEL, api, type ChangeSet, type Status } from '../api.ts';

const STATUS_CLASS: Record<Status, string> = {
  draft: '', pending_approval: 'st-part', approved: 'st-info', rejected: 'st-err', running: 'st-info', done: 'st-ok', partial: 'st-part', failed: 'st-err'
};
const ITEM_LABEL = { pending: 'Da applicare', ok: 'Applicata', error: 'Errore', conflict: 'Conflitto' } as const;

interface Props { id: string; onOpen: (id: string) => void; onBack: () => void }

/** Rows rendered at once in the detail table; big change sets render on demand. */
const PAGE = 250;

export function ChangeSetPage({ id, onOpen, onBack }: Props) {
  const [cs, setCs] = useState<ChangeSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [opFilter, setOpFilter] = useState<'all' | 'insert' | 'update' | 'delete' | 'warn' | 'failed'>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => { api.changeSet(id).then(setCs).catch(e => setError(e.message)); }, [id]);
  useEffect(() => {
    if (cs?.status !== 'running') return;
    const t = setInterval(() => api.changeSet(id).then(setCs), 1500);
    return () => clearInterval(t);
  }, [id, cs?.status]);

  if (error && !cs) return <div className="banner prod">{error}</div>;
  if (!cs) return <p className="muted">Caricamento…</p>;

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
  const canRun = reviewed && (!prod || confirmName.trim() === cs.org.name);

  return (
    <>
      <div className="view-head">
        <div>
          <div className="eyebrow">{cs.number} · {cs.org.name}</div>
          <h1>{finished ? 'Risultato' : 'Anteprima modifiche'} <span className={`pill ${STATUS_CLASS[cs.status]}`}>{STATUS_LABEL[cs.status]}</span></h1>
          <p>{cs.description}{cs.rollbackOf && ' · annulla un change set precedente'}</p>
        </div>
        <span className="spacer" />
        <button className="btn" onClick={onBack}>Indietro</button>
      </div>
      {error && <div className="banner prod">{error}</div>}
      {notice && <div className="banner info">{notice}</div>}

      <div className="kpis">
        <div className="kpi"><div className="k">Modifiche</div><div className="n">{items.length}</div></div>
        <div className="kpi good"><div className="k">Nuovi accessi</div><div className="n">{count('insert')}</div></div>
        <div className="kpi"><div className="k">Accessi cambiati</div><div className="n">{count('update')}</div></div>
        <div className="kpi bad"><div className="k">Accessi rimossi</div><div className="n">{count('delete')}</div></div>
        {finished
          ? <div className="kpi bad"><div className="k">Errori e conflitti</div><div className="n">{failed.length}</div></div>
          : <div className="kpi warn"><div className="k">Con avvisi</div><div className="n">{items.filter(i => i.warnings.length).length}</div></div>}
      </div>

      <div className="prev-grid">
        <section className="panel" style={{ minWidth: 0 }}>
          <div className="panel-h"><h2>Dettaglio</h2>
            <div className="row">
              {([['all', 'Tutte'], ['insert', 'Insert'], ['update', 'Update'], ['delete', 'Delete'], ['warn', 'Con avvisi'], ...(finished ? [['failed', 'Errori']] : [])] as [typeof opFilter, string][]).map(([f, l]) => (
                <button key={f} className="chip" aria-pressed={opFilter === f} onClick={() => { setOpFilter(f); setLimit(PAGE); }}>{l}</button>
              ))}
            </div>
          </div>
          <div className="tbl-wrap">
            <table className="dt">
              <thead><tr><th>Profilo / permission set</th><th>Campo</th><th>Prima</th><th>Dopo</th><th>Operazione</th><th>Esito</th></tr></thead>
              <tbody>
                {shown.slice(0, limit).map(i => (
                  <tr key={i.id}>
                    <td>{i.parentLabel}</td>
                    <td><span className="mono">{i.field}</span>
                      {i.warnings.map(w => <div className="warn-text" key={w}>⚠ {WARNING_LABEL[w] ?? w}</div>)}
                      {i.errorMessage && <div className="err-text"><span className="mono">{i.errorCode}</span> {i.errorMessage}</div>}
                    </td>
                    <td className="mono">{ACCESS_SHORT[i.before]}</td>
                    <td className="mono"><b>{ACCESS_SHORT[i.after]}</b></td>
                    <td><span className={`pill op-${i.op}`}>{i.op}</span></td>
                    <td><span className={`pill ${i.status === 'ok' ? 'st-ok' : i.status === 'pending' ? '' : 'st-err'}`}>{ITEM_LABEL[i.status]}</span></td>
                  </tr>
                ))}
                {!shown.length && <tr><td colSpan={6} className="muted">Nessuna riga.</td></tr>}
                {shown.length > limit && (
                  <tr><td colSpan={6}><span className="muted">Mostrate {limit} di {shown.length}.</span> <button className="btn sm" onClick={() => setLimit(l => l + PAGE * 4)}>Mostra altre</button></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="stack">
          {Object.keys(skippedByReason).length > 0 && (
            <section className="panel"><div className="panel-h"><h2>Escluse automaticamente</h2></div>
              <ul className="panel-b plain">{Object.entries(skippedByReason).map(([r, n]) => <li key={r}><b>{n}</b> {SKIP_LABEL[r] ?? r}</li>)}</ul>
            </section>
          )}

          <section className="panel">
            <div className="panel-h"><h2>{prod ? 'Approvazione' : 'Conferma'}</h2>{prod && <span className="env prod">2 step</span>}</div>
            <div className="panel-b stack">
              {cs.status === 'draft' && items.length === 0 && <p className="muted">Nessuna modifica da applicare.</p>}
              {cs.status === 'draft' && items.length > 0 && prod && (
                <>
                  <p className="muted">Org di produzione: il change set va inviato per approvazione prima di essere eseguito.</p>
                  <button className="btn primary" disabled={busy} onClick={() => act(() => api.submit(cs.id))}>Invia per approvazione</button>
                </>
              )}
              {cs.status === 'pending_approval' && (
                <>
                  <p className="muted">Inviato il {new Date(cs.submittedAt!).toLocaleString('it-IT')}. Approvando, l'app ricontrolla lo stato attuale dell'org.</p>
                  <div className="row">
                    <button className="btn danger" disabled={busy} onClick={() => act(() => api.reject(cs.id))}>Rifiuta</button>
                    <button className="btn primary" disabled={busy} onClick={() => act(() => api.approve(cs.id), r => {
                      setCs(r);
                      setNotice(r.conflicts ? `${r.conflicts} righe sono cambiate nell'org dopo l'anteprima: verranno saltate.` : 'Approvato. Nessun conflitto con lo stato attuale dell\'org.');
                    })}>Approva</button>
                  </div>
                </>
              )}
              {((cs.status === 'draft' && !prod && items.length > 0) || cs.status === 'approved') && (
                <>
                  {prod && (
                    <label className="field"><span>Digita <b>{cs.org.name}</b> per confermare</span>
                      <input className="input" id="confirm-name" value={confirmName} onChange={e => setConfirmName(e.target.value)} />
                    </label>
                  )}
                  <label className="check"><input type="checkbox" id="reviewed" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />Ho rivisto le {items.length} modifiche</label>
                  <button className="btn primary" disabled={!canRun || busy} onClick={() => act(() => api.execute(cs.id, prod ? confirmName : undefined))}>Applica {items.length} modifiche</button>
                </>
              )}
              {cs.status === 'running' && <p>Applicazione in corso… la pagina si aggiorna da sola.</p>}
              {cs.status === 'rejected' && <p className="muted">Change set rifiutato. Torna alla matrice per prepararne uno nuovo.</p>}
              {finished && (
                <>
                  <p>{cs.status === 'done' ? 'Tutte le modifiche sono state applicate e verificate rileggendo l\'org.' : `${items.length - failed.length} modifiche applicate, ${failed.length} non applicate.`}</p>
                  {items.some(i => i.status === 'ok') && (
                    <button className="btn" disabled={busy} onClick={() => act(() => api.rollback(cs.id), r => onOpen(r.id))}>Annulla queste modifiche</button>
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
