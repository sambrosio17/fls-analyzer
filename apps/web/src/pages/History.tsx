import { useEffect, useState } from 'react';
import { STATUS_LABEL, api, type ChangeSetSummary, type Org } from '../api.ts';

export function History({ orgs, onOpen }: { orgs: Org[]; onOpen: (id: string) => void }) {
  const [list, setList] = useState<ChangeSetSummary[] | null>(null);
  useEffect(() => { api.changeSets().then(setList); }, []);
  const orgName = (id: string) => orgs.find(o => o.id === id)?.label ?? '—';

  return (
    <>
      <div className="view-head"><div><h1>Storico modifiche</h1><p>Ogni change set registra chi l'ha preparato e approvato, quando, e lo stato di prima per poterlo annullare.</p></div></div>
      <section className="panel">
        <div className="tbl-wrap">
          <table className="dt">
            <thead><tr><th>Change set</th><th>Creato</th><th>Org</th><th>Descrizione</th><th>Modifiche</th><th>Stato</th><th /></tr></thead>
            <tbody>
              {list?.map(cs => (
                <tr key={cs.id}>
                  <td className="mono">{cs.number}</td>
                  <td>{new Date(cs.createdAt).toLocaleString('it-IT')}</td>
                  <td>{orgName(cs.orgId)}</td>
                  <td>{cs.description}</td>
                  <td>{cs.total}{cs.errors > 0 && <span className="err-text"> · {cs.errors} non applicate</span>}</td>
                  <td>{STATUS_LABEL[cs.status]}</td>
                  <td><button className="btn sm" onClick={() => onOpen(cs.id)}>Apri</button></td>
                </tr>
              ))}
              {list?.length === 0 && <tr><td colSpan={7} className="muted">Nessun change set ancora.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
