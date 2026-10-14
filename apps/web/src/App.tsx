import { useEffect, useState } from 'react';
import { api, type Org } from './api.ts';
import { Login } from './pages/Login.tsx';
import { Orgs } from './pages/Orgs.tsx';
import { MatrixPage } from './pages/Matrix.tsx';
import { ChangeSetPage } from './pages/ChangeSet.tsx';
import { History } from './pages/History.tsx';

type View = 'orgs' | 'matrix' | 'changeset' | 'history';

export function App() {
  const [session, setSession] = useState<boolean | null>(null);
  const [view, setView] = useState<View>('orgs');
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [changeSetId, setChangeSetId] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => { api.session().then(s => setSession(s.authenticated)).catch(() => setSession(false)); }, []);

  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(location.search);
    const fromOAuth = params.get('org');
    setOauthError(params.get('oauthError'));
    if (location.search) history.replaceState(null, '', '/');
    api.orgs().then(list => {
      setOrgs(list);
      if (fromOAuth && list.some(o => o.id === fromOAuth)) { setOrgId(fromOAuth); setView('matrix'); }
    });
  }, [session]);

  if (session === null) return null;
  if (!session) return <Login onDone={() => setSession(true)} />;

  const org = orgs.find(o => o.id === orgId) ?? null;
  const openChangeSet = (id: string) => { setChangeSetId(id); setView('changeset'); };
  const tabs: [View, string, boolean][] = [['orgs', 'Org', true], ['matrix', 'Matrice FLS', !!org], ['history', 'Storico', true]];

  return (
    <>
      <header className="appbar">
        <div className="wrap appbar-row">
          <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>FLS Analyzer</div>
          <nav className="tabs">
            {tabs.map(([v, label, enabled]) => (
              <button key={v} className="tab" disabled={!enabled} aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>{label}</button>
            ))}
          </nav>
          <span className="spacer" />
          {org && (
            <button className="org-chip" onClick={() => setView('orgs')}>
              <span className="dot ok" />{org.name}<span className={`env ${org.isSandbox ? 'sandbox' : 'prod'}`}>{org.isSandbox ? 'Sandbox' : 'Produzione'}</span>
            </button>
          )}
          <button className="btn sm" onClick={() => api.logout().then(() => setSession(false))}>Esci</button>
        </div>
      </header>
      <main className="wrap">
        {view === 'orgs' && (
          <Orgs orgs={orgs} error={oauthError} selectedId={orgId}
            onOpen={id => { setOrgId(id); setView('matrix'); }}
            onRemoved={id => { setOrgs(orgs.filter(o => o.id !== id)); if (id === orgId) setOrgId(null); }} />
        )}
        {view === 'matrix' && org && <MatrixPage key={org.id} org={org} onChangeSet={openChangeSet} />}
        {view === 'changeset' && changeSetId && <ChangeSetPage key={changeSetId} id={changeSetId} onOpen={openChangeSet} onBack={() => setView(org ? 'matrix' : 'history')} />}
        {view === 'history' && <History orgs={orgs} onOpen={openChangeSet} />}
      </main>
    </>
  );
}
