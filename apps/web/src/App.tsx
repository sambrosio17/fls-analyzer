import { useEffect, useState } from 'react';
import { api, type Org } from './api.ts';
import { Login } from './pages/Login.tsx';
import { Orgs } from './pages/Orgs.tsx';
import { MatrixPage } from './pages/Matrix.tsx';
import { ChangeSetPage } from './pages/ChangeSet.tsx';
import { History } from './pages/History.tsx';
import { LayoutsPage } from './pages/Layouts.tsx';
import { Brand } from './Brand.tsx';
import { closeTab, loadWorkspace, openTab, pruneTabs, saveWorkspace, tabTitle, updateTab, type Tool, type WorkTab, type Workspace } from './workspace.ts';

type View = 'orgs' | 'history' | 'work';

const storage = (() => { try { return window.localStorage; } catch { return null; } })();

export function App() {
  const [session, setSession] = useState<boolean | null>(null);
  const [view, setView] = useState<View>('orgs');
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [ws, setWs] = useState<Workspace>(() => loadWorkspace(storage));
  // Tabs are mounted the first time they are shown and then kept, so switching tabs keeps filters and pending changes.
  const [mounted, setMounted] = useState(() => new Set<string>());
  const [oauthError, setOauthError] = useState<string | null>(null);
  // Tabs with matrix changes not yet sent to a change set.
  const [dirty, setDirty] = useState(() => new Set<string>());

  useEffect(() => { api.session().then(s => setSession(s.authenticated)).catch(() => setSession(false)); }, []);
  useEffect(() => { saveWorkspace(storage, ws); }, [ws]);
  useEffect(() => {
    if (!dirty.size) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty.size > 0]);
  useEffect(() => {
    if (view === 'work' && ws.active && !mounted.has(ws.active)) setMounted(new Set(mounted).add(ws.active));
  }, [view, ws.active]);

  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(location.search);
    const fromOAuth = params.get('org');
    setOauthError(params.get('oauthError'));
    if (location.search) history.replaceState(null, '', '/');
    api.orgs().then(list => {
      setOrgs(list);
      setWs(w => {
        const pruned = pruneTabs(w, list.map(o => o.id));
        return fromOAuth && list.some(o => o.id === fromOAuth) ? openTab(pruned, { orgId: fromOAuth, tool: null, objects: [] }) : pruned;
      });
      if ((fromOAuth && list.some(o => o.id === fromOAuth)) || ws.tabs.length) setView('work');
    });
  }, [session]);

  if (session === null) return null;
  if (!session) return <Login onDone={() => setSession(true)} />;
  if (!orgs) return null;

  const orgById = (id: string | null) => orgs.find(o => o.id === id) ?? null;
  const active = view === 'work' ? ws.tabs.find(t => t.id === ws.active) ?? null : null;
  const activeOrg = orgById(active?.orgId ?? null);

  const open = (tab: Omit<WorkTab, 'id'>) => { setWs(w => openTab(w, tab)); setView('work'); };
  const select = (id: string) => { setWs(w => ({ ...w, active: id })); setView('work'); };
  const close = (id: string) => {
    if (dirty.has(id) && !window.confirm('Questa scheda ha modifiche non ancora mandate in anteprima. Chiuderla e perderle?')) return;
    setDirty(d => { const n = new Set(d); n.delete(id); return n; });
    setWs(w => closeTab(w, id));
  };
  const markDirty = (id: string, on: boolean) => setDirty(d => {
    if (d.has(id) === on) return d;
    const n = new Set(d); if (on) n.add(id); else n.delete(id); return n;
  });
  const patch = (id: string, p: Partial<WorkTab>) => setWs(w => updateTab(w, id, p));
  const openChangeSet = (id: string, orgId: string) => {
    const existing = ws.tabs.find(t => t.tool === 'changeset' && t.changeSetId === id);
    if (existing) select(existing.id); else open({ orgId, tool: 'changeset', objects: [], changeSetId: id });
  };

  return (
    <>
      <header className="appbar">
        <div className="wrap appbar-row">
          <Brand />
          <nav className="tabs">
            <button className="tab" aria-current={view === 'orgs' ? 'page' : undefined} onClick={() => setView('orgs')}>Org</button>
            <button className="tab" aria-current={view === 'history' ? 'page' : undefined} onClick={() => setView('history')}>Storico</button>
          </nav>
          <span className="spacer" />
          {activeOrg ? (
            <button className="org-chip" onClick={() => setView('orgs')} title={`${activeOrg.name} · ${activeOrg.username}`}>
              <span className="dot ok" /><b>{activeOrg.label}</b><span className={`env ${activeOrg.isSandbox ? 'sandbox' : 'prod'}`}>{activeOrg.isSandbox ? 'Sandbox' : 'Produzione'}</span>
            </button>
          ) : (
            <button className="org-chip muted" onClick={() => setView('orgs')}>Nessuna org aperta</button>
          )}
          <button className="btn sm" onClick={() => api.logout().then(() => setSession(false))}>Esci</button>
        </div>
        <div className="wrap worktabs" role="tablist" aria-label="Schede di lavoro">
          {ws.tabs.map(t => {
            const org = orgById(t.orgId);
            const title = tabTitle(t, org?.label ?? null);
            const current = view === 'work' && t.id === ws.active;
            return (
              <div key={t.id} className={`worktab${current ? ' on' : ''}${org && !org.isSandbox ? ' prod' : ''}${dirty.has(t.id) ? ' dirty' : ''}`} title={title.join(' › ')}
                onAuxClick={e => { if (e.button === 1) close(t.id); }}>
                <button role="tab" aria-selected={current} className="worktab-label" onClick={() => select(t.id)}>
                  {title.map((part, i) => <span key={i} className={i === 0 ? 'wt-org' : i === 1 ? 'wt-tool' : 'wt-obj'}>{part}</span>)}
                </button>
                <button className="worktab-x" aria-label={`Chiudi ${title.join(' › ')}`} onClick={() => close(t.id)}>×</button>
              </div>
            );
          })}
          <button className="worktab-add" aria-label="Nuova scheda" title="Nuova scheda"
            onClick={() => open({ orgId: active?.orgId ?? (orgs.length === 1 ? orgs[0]!.id : null), tool: null, objects: [] })}>+</button>
        </div>
      </header>
      <main className="wrap">
        {view === 'orgs' && (
          <Orgs orgs={orgs} error={oauthError} selectedId={activeOrg?.id ?? null}
            onOpen={id => open({ orgId: id, tool: null, objects: [] })}
            onRemoved={id => { setOrgs(orgs.filter(o => o.id !== id)); setWs(w => pruneTabs(w, orgs.filter(o => o.id !== id).map(o => o.id))); }}
            onRenamed={updated => setOrgs(orgs.map(o => o.id === updated.id ? updated : o))} />
        )}
        {view === 'history' && <History orgs={orgs} onOpen={openChangeSet} />}
        {view === 'work' && !active && (
          <div className="panel empty">Nessuna scheda aperta. <button className="btn sm primary" onClick={() => open({ orgId: orgs.length === 1 ? orgs[0]!.id : null, tool: null, objects: [] })}>Nuova scheda</button></div>
        )}
        {ws.tabs.filter(t => mounted.has(t.id) || t.id === active?.id).map(t => (
          <div key={t.id} hidden={t.id !== active?.id}>
            <TabBody tab={t} org={orgById(t.orgId)} orgs={orgs}
              onPatch={p => patch(t.id, p)} onClose={() => close(t.id)} onOrgs={() => setView('orgs')}
              onChangeSet={id => t.orgId && openChangeSet(id, t.orgId)} onDirty={on => markDirty(t.id, on)} />
          </div>
        ))}
      </main>
    </>
  );
}

function TabBody({ tab, org, orgs, onPatch, onClose, onOrgs, onChangeSet, onDirty }: {
  tab: WorkTab; org: Org | null; orgs: Org[];
  onPatch: (p: Partial<WorkTab>) => void; onClose: () => void; onOrgs: () => void; onChangeSet: (id: string) => void; onDirty: (dirty: boolean) => void;
}) {
  if (!org || !tab.tool) return <NewTab orgs={orgs} orgId={org?.id ?? null} onPick={(orgId, tool) => onPatch({ orgId, tool })} onOrgs={onOrgs} />;
  switch (tab.tool) {
    case 'matrix':
      return <MatrixPage org={org} onChangeSet={onChangeSet} initialObjects={tab.objects} onObjectsChange={objects => onPatch({ objects })} onDirtyChange={onDirty} />;
    case 'layouts':
      return <LayoutsPage org={org} initialObject={tab.objects[0] ?? null} initialTab={tab.layoutMode}
        onChange={(object, layoutMode) => onPatch({ objects: object ? [object] : [], layoutMode })} />;
    case 'changeset':
      return tab.changeSetId ? <ChangeSetPage key={tab.changeSetId} id={tab.changeSetId} onOpen={id => onPatch({ changeSetId: id })} onBack={onClose} /> : null;
  }
}

/** A new tab: pick the org, then the tool. */
function NewTab({ orgs, orgId, onPick, onOrgs }: { orgs: Org[]; orgId: string | null; onPick: (orgId: string, tool: Tool) => void; onOrgs: () => void }) {
  const [picked, setPicked] = useState(orgId ?? '');
  if (!orgs.length) return <div className="panel empty">Nessuna org collegata. <button className="btn sm primary" onClick={onOrgs}>Collega una org</button></div>;
  return (
    <>
      <div className="view-head"><div><h1>Nuova scheda</h1><p>Scegli l'org e lo strumento. Ogni scheda tiene il suo oggetto e i suoi filtri, così puoi lavorare su più org e oggetti insieme.</p></div></div>
      <section className="panel panel-b newtab">
        <label className="field"><span>Org</span>
          <select className="input" id="newtab-org" value={picked} onChange={e => setPicked(e.target.value)}>
            <option value="" disabled>Scegli un'org</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.label}{o.isSandbox ? '' : ' (Produzione)'}</option>)}
          </select>
        </label>
        <div className="field"><span>Strumento</span>
          <div className="row">
            <button className="btn primary" disabled={!picked} onClick={() => onPick(picked, 'matrix')}>Matrice FLS</button>
            <button className="btn primary" disabled={!picked} onClick={() => onPick(picked, 'layouts')}>Layout e pagine</button>
          </div>
        </div>
      </section>
    </>
  );
}
