import { useEffect, useState } from 'react';
import { useT } from '../i18n.tsx';
import { api, type ChangeSetSummary, type Org } from '../api.ts';

export function History({ orgs, onOpen }: { orgs: Org[]; onOpen: (id: string, orgId: string, number: string) => void }) {
  const t = useT();
  const [list, setList] = useState<ChangeSetSummary[] | null>(null);
  useEffect(() => { api.changeSets().then(setList); }, []);
  const orgName = (id: string) => orgs.find(o => o.id === id)?.label ?? '—';

  return (
    <>
      <div className="view-head"><div><h1>{t.history.title}</h1><p>{t.history.intro}</p></div></div>
      <section className="panel">
        <div className="tbl-wrap">
          <table className="dt">
            <thead><tr>{t.history.cols.map(c => <th key={c}>{c}</th>)}<th /></tr></thead>
            <tbody>
              {list?.map(cs => (
                <tr key={cs.id}>
                  <td className="mono">{cs.number}</td>
                  <td>{new Date(cs.createdAt).toLocaleString(t.locale)}</td>
                  <td>{orgName(cs.orgId)}</td>
                  <td>{cs.description}</td>
                  <td>{cs.total}{cs.errors > 0 && <span className="err-text"> · {t.history.notApplied(cs.errors)}</span>}</td>
                  <td>{t.status[cs.status]}</td>
                  <td><button className="btn sm" onClick={() => onOpen(cs.id, cs.orgId, cs.number)}>{t.common.open}</button></td>
                </tr>
              ))}
              {list?.length === 0 && <tr><td colSpan={7} className="muted">{t.history.empty}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
