import { useState, type FormEvent } from 'react';
import { api, type Org } from '../api.ts';
import { TokenRefresh } from '../TokenButton.tsx';

interface Props {
  orgs: Org[];
  error: string | null;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onRemoved: (id: string) => void;
  onRenamed: (org: Org) => void;
}

export function Orgs({ orgs, error, selectedId, onOpen, onRemoved, onRenamed }: Props) {
  const [env, setEnv] = useState<'production' | 'sandbox' | 'custom'>('sandbox');
  const [domain, setDomain] = useState('');
  const [alias, setAlias] = useState('');
  const [editing, setEditing] = useState<{ id: string; alias: string } | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const connect = (e: FormEvent) => {
    e.preventDefault();
    const q = new URLSearchParams({ env, alias: alias.trim(), ...(env === 'custom' ? { domain } : {}) });
    location.href = `/oauth/start?${q}`;
  };
  const remove = async (o: Org) => {
    if (!window.confirm(`Scollegare ${o.label}? Il token salvato verrà eliminato.`)) return;
    await api.removeOrg(o.id);
    onRemoved(o.id);
  };
  const rename = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try { onRenamed(await api.renameOrg(editing.id, editing.alias.trim())); setEditing(null); setRenameError(null); }
    catch (err) { setRenameError((err as Error).message); }
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
              <TokenRefresh org={o} key={o.id}>{(tokenButton, tokenMessage) => (
              <div className="org-card">
                <span className="dot ok" />
                <div>
                  {editing?.id === o.id ? (
                    <form className="row" onSubmit={rename}>
                      <input className="input" id={`alias-${o.id}`} aria-label="Alias" autoFocus required maxLength={40} value={editing.alias} onChange={e => setEditing({ id: o.id, alias: e.target.value })} />
                      <button className="btn sm primary" type="submit">Salva</button>
                      <button className="btn sm" type="button" onClick={() => { setEditing(null); setRenameError(null); }}>Annulla</button>
                    </form>
                  ) : (
                    <h3>{o.label} <span className={`env ${o.isSandbox ? 'sandbox' : 'prod'}`}>{o.isSandbox ? 'Sandbox' : 'Produzione'}</span></h3>
                  )}
                  {editing?.id === o.id && renameError && <p className="err-text">{renameError}</p>}
                  <p>{o.alias && <>{o.name} · </>}<span className="mono">{o.username}</span>{o.lastSyncAt && ` · letta il ${new Date(o.lastSyncAt).toLocaleString('it-IT')}`}</p>
                </div>
                <div className="row">
                  {tokenButton}
                  <button className="btn sm" onClick={() => setEditing({ id: o.id, alias: o.alias ?? '' })}>{o.alias ? 'Rinomina' : 'Aggiungi alias'}</button>
                  <button className="btn sm" onClick={() => remove(o)}>Scollega</button>
                  <button className={`btn sm ${o.id === selectedId ? '' : 'primary'}`} onClick={() => onOpen(o.id)}>Apri</button>
                </div>
                {tokenMessage}
              </div>
              )}</TokenRefresh>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-h"><h2>Collega una nuova org</h2></div>
          <form className="panel-b" onSubmit={connect}>
            <label className="field"><span>Alias</span>
              <input className="input" id="alias" required maxLength={40} placeholder="es. Acme UAT" value={alias} onChange={e => setAlias(e.target.value)} />
              <small className="muted">Il nome con cui vedrai questa org nell'app. Utile perché le sandbox hanno lo stesso nome della produzione.</small>
            </label>
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
