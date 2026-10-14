import { useState, type FormEvent } from 'react';
import { api, type Org } from '../api.ts';

interface Props {
  orgs: Org[];
  error: string | null;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onRemoved: (id: string) => void;
}

export function Orgs({ orgs, error, selectedId, onOpen, onRemoved }: Props) {
  const [env, setEnv] = useState<'production' | 'sandbox' | 'custom'>('sandbox');
  const [domain, setDomain] = useState('');
  const connect = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams({ env, ...(env === 'custom' ? { domain } : {}) });
    location.href = `/oauth/start?${q}`;
  };
  const remove = async (o: Org) => {
    if (!window.confirm(`Scollegare ${o.name}? Il token salvato verrà eliminato.`)) return;
    await api.removeOrg(o.id);
    onRemoved(o.id);
  };

  return (
    <>
      <div className="view-head"><div>
        <h1>Org Salesforce</h1>
        <p>L'app usa OAuth: non vede la tua password e agisce con i permessi del tuo utente Salesforce.</p>
      </div></div>
      {error && <div className="banner prod">Collegamento non riuscito: {error}</div>}
      <div className="two-col">
        <section className="panel">
          <div className="panel-h"><h2>Org collegate</h2><span className="muted">{orgs.length}</span></div>
          <div className="panel-b stack">
            {orgs.length === 0 && <p className="muted">Nessuna org collegata. Collegane una con il modulo qui accanto.</p>}
            {orgs.map(o => (
              <div className="org-card" key={o.id}>
                <span className="dot ok" />
                <div>
                  <h3>{o.name} <span className={`env ${o.isSandbox ? 'sandbox' : 'prod'}`}>{o.isSandbox ? 'Sandbox' : 'Produzione'}</span></h3>
                  <p><span className="mono">{o.username}</span>{o.lastSyncAt && ` · letta il ${new Date(o.lastSyncAt).toLocaleString('it-IT')}`}</p>
                </div>
                <div className="row">
                  <button className="btn sm" onClick={() => remove(o)}>Scollega</button>
                  <button className={`btn sm ${o.id === selectedId ? '' : 'primary'}`} onClick={() => onOpen(o.id)}>Apri</button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-h"><h2>Collega una nuova org</h2></div>
          <form className="panel-b" onSubmit={connect}>
            <div className="field"><span>Ambiente</span>
              <div className="seg">
                {([['production', 'Produzione'], ['sandbox', 'Sandbox'], ['custom', 'My Domain']] as const).map(([v, l]) => (
                  <label key={v}><input type="radio" name="env" id={`env-${v}`} checked={env === v} onChange={() => setEnv(v)} />{l}</label>
                ))}
              </div>
            </div>
            {env === 'custom' && (
              <label className="field"><span>My Domain</span>
                <input className="input mono" id="domain" required placeholder="acme.my.salesforce.com" value={domain} onChange={e => setDomain(e.target.value)} />
              </label>
            )}
            <div className="field"><span>Permessi richiesti al tuo utente</span>
              <ul className="req-list"><li>API Enabled</li><li>View Setup and Configuration</li><li>Manage Profiles and Permission Sets (per modificare)</li></ul>
            </div>
            <button className="btn primary" type="submit">Accedi con Salesforce</button>
          </form>
        </section>
      </div>
    </>
  );
}
