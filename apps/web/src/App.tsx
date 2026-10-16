import { useEffect, useState } from 'react';
import { api, type Org } from './api.ts';
import { Login } from './pages/Login.tsx';
import { Orgs } from './pages/Orgs.tsx';
import { MatrixPage } from './pages/Matrix.tsx';
import { ChangeSetPage } from './pages/ChangeSet.tsx';
import { History } from './pages/History.tsx';
import { LayoutsPage } from './pages/Layouts.tsx';
import { Brand } from './Brand.tsx';
import { TokenTabButton } from './TokenButton.tsx';
import {
  TOOLS, TOOL_LABEL, closeOrg, closeTab, groupTabs, loadWorkspace, newObjectTab, openChangeSet, openOrg, pruneOrgs, saveWorkspace,
  selectTab, selectTool, tabTitle, toolOf, updateTab, visibleTab, type WorkTab, type Workspace
} from './workspace.ts';

type View = 'orgs' | 'history' | 'work';

const storage = (() => { try { return window.localStorage; } catch { return null; } })();
const LOSE = 'modifiche non ancora mandate in anteprima';

export function App() {
  const [session, setSession] = useState<boolean | null>(null);
  const [view, setView] = useState<View>('orgs');
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [ws, setWs] = useState<Workspace>(() => loadWorkspace(storage));
  // Object tabs are mounted the first time they are shown and then kept, so switching keeps filters and pending changes.
  const [mounted, setMounted] = useState(() => new Set<string>());
  // Object tabs with matrix changes not yet sent to a change set.
  const [dirty, setDirty] = useState(() => new Set<string>());
  const [orgMenu, setOrgMenu] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const shown = view === 'work' ? visibleTab(ws) : null;

  useEffect(() => { api.session().then(s => setSession(s.authenticated)).catch(() => setSession(false)); }, []);
  useEffect(() => { saveWorkspace(storage, ws); }, [ws]);
  useEffect(() => { if (shown && !mounted.has(shown.id)) setMounted(new Set(mounted).add(shown.id)); }, [shown?.id]);
  useEffect(() => {
    if (!orgMenu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as Element).closest?.('.orgtab-add-wrap')) setOrgMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [orgMenu]);
  useEffect(() => {
    if (!dirty.size) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty.size > 0]);

  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(location.search);
    const fromOAuth = params.get('org');
    setOauthError(params.get('oauthError'));
    if (location.search) history.replaceState(null, '', '/');
    api.orgs().then(list => {
      setOrgs(list);
      const fresh = fromOAuth && list.some(o => o.id === fromOAuth) ? fromOAuth : null;
      setWs(w => { const pruned = pruneOrgs(w, list.map(o => o.id)); return fresh ? openOrg(pruned, fresh) : pruned; });
      if (fresh || ws.orgs.some(id => list.some(o => o.id === id))) setView('work');
    });
  }, [session]);

  if (session === null) return null;
  if (!session) return <Login onDone={() => setSession(true)} />;
  if (!orgs) return null;

  const orgById = (id: string | null) => orgs.find(o => o.id === id) ?? null;
  const go = (next: Workspace) => { setWs(next); setView('work'); setOrgMenu(false); };
  const forget = (ids: string[]) => setDirty(d => { const n = new Set(d); ids.forEach(id => n.delete(id)); return n; });
  const markDirty = (id: string, on: boolean) => setDirty(d => {
    if (d.has(id) === on) return d;
    const n = new Set(d); if (on) n.add(id); else n.delete(id); return n;
  });
  const closeObject = (t: WorkTab) => {
    if (dirty.has(t.id) && !window.confirm(`Questa scheda ha ${LOSE}. Chiuderla e perderle?`)) return;
    forget([t.id]); setWs(w => closeTab(w, t.id));
  };
  const closeOrgTab = (orgId: string) => {
    const ids = ws.tabs.filter(t => t.orgId === orgId).map(t => t.id);
    if (ids.some(id => dirty.has(id)) && !window.confirm(`In questa org ci sono schede con ${LOSE}. Chiuderla e perderle?`)) return;
    forget(ids); setWs(w => closeOrg(w, orgId));
  };
  const showChangeSet = (orgId: string, id: string, number?: string) => go(openChangeSet(ws, orgId, id, number));

  const activeOrg = view === 'work' ? orgById(ws.activeOrg) : null;
  const tool = activeOrg ? toolOf(ws, activeOrg.id) : null;
  const group = activeOrg && tool ? groupTabs(ws, activeOrg.id, tool) : [];
  const closedOrgs = orgs.filter(o => !ws.orgs.includes(o.id));

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
          <button className="btn sm" onClick={() => api.logout().then(() => setSession(false))}>Esci</button>
        </div>
        <div className="wrap orgtabs" role="tablist" aria-label="Org aperte">
          {ws.orgs.map(id => {
            const o = orgById(id);
            if (!o) return null;
            const on = view === 'work' && ws.activeOrg === id;
            const changed = ws.tabs.some(t => t.orgId === id && dirty.has(t.id));
            return (
              <div key={id} className={`orgtab${on ? ' on' : ''}${o.isSandbox ? '' : ' prod'}${changed ? ' dirty' : ''}`} title={`${o.name} · ${o.username}`}
                onAuxClick={e => { if (e.button === 1) closeOrgTab(id); }}>
                <button role="tab" aria-selected={on} className="orgtab-label" onClick={() => go(openOrg(ws, id))}>
                  <b>{o.label}</b><span className={`env ${o.isSandbox ? 'sandbox' : 'prod'}`}>{o.isSandbox ? 'Sandbox' : 'Produzione'}</span>
                </button>
                {on && <TokenTabButton org={o} />}
                <button className="tab-x" aria-label={`Chiudi ${o.label}`} onClick={() => closeOrgTab(id)}>×</button>
              </div>
            );
          })}
          <div className="orgtab-add-wrap">
            <button className="tab-add" aria-label="Apri un'org" title="Apri un'org" aria-expanded={orgMenu} onClick={() => setOrgMenu(!orgMenu)}>+</button>
            {orgMenu && (
              <ul className="menu" role="menu">
                {closedOrgs.map(o => (
                  <li key={o.id}><button role="menuitem" onClick={() => go(openOrg(ws, o.id))}>{o.label} <span className={`env ${o.isSandbox ? 'sandbox' : 'prod'}`}>{o.isSandbox ? 'Sandbox' : 'Produzione'}</span></button></li>
                ))}
                {closedOrgs.length === 0 && <li className="muted menu-note">{orgs.length ? 'Tutte le org collegate sono già aperte.' : 'Nessuna org collegata.'}</li>}
                <li><button role="menuitem" onClick={() => { setView('orgs'); setOrgMenu(false); }}>Collega o gestisci org…</button></li>
              </ul>
            )}
          </div>
        </div>
      </header>

      {activeOrg && tool && (
        <div className="subtabs">
          <div className="wrap tooltabs" role="tablist" aria-label="Strumenti">
            {TOOLS.map(t => {
              const n = groupTabs(ws, activeOrg.id, t).length;
              return (
                <button key={t} role="tab" aria-selected={t === tool} className={`tooltab${t === tool ? ' on' : ''}`} onClick={() => go(selectTool(ws, activeOrg.id, t))}>
                  {TOOL_LABEL[t]}{t === 'changeset' && n > 0 && <span className="count">{n}</span>}
                </button>
              );
            })}
          </div>
          <div className="wrap objtabs" role="tablist" aria-label={tool === 'changeset' ? 'Change set aperti' : 'Oggetti aperti'}>
            {group.map(t => {
              const on = t.id === shown?.id;
              const title = tabTitle(t);
              return (
                <div key={t.id} className={`objtab${on ? ' on' : ''}${dirty.has(t.id) ? ' dirty' : ''}${t.objects.length || t.tool === 'changeset' ? '' : ' empty'}`} title={title}
                  onAuxClick={e => { if (e.button === 1) closeObject(t); }}>
                  <button role="tab" aria-selected={on} className="objtab-label" onClick={() => go(selectTab(ws, t.id))}>{title}</button>
                  <button className="tab-x" aria-label={`Chiudi ${title}`} onClick={() => closeObject(t)}>×</button>
                </div>
              );
            })}
            {tool !== 'changeset' && (
              <button className="tab-add" aria-label="Nuovo oggetto" title="Nuovo oggetto" onClick={() => go(newObjectTab(ws, activeOrg.id, tool))}>+</button>
            )}
          </div>
        </div>
      )}

      <main className="wrap">
        {view === 'orgs' && (
          <Orgs orgs={orgs} error={oauthError} selectedId={ws.activeOrg}
            onOpen={id => go(openOrg(ws, id))}
            onRemoved={id => { setOrgs(orgs.filter(o => o.id !== id)); setWs(w => closeOrg(w, id)); }}
            onRenamed={updated => setOrgs(orgs.map(o => o.id === updated.id ? updated : o))} />
        )}
        {view === 'history' && <History orgs={orgs} onOpen={(id, orgId, number) => showChangeSet(orgId, id, number)} />}
        {view === 'work' && !activeOrg && (
          <div className="panel empty">Nessuna org aperta. Aprine una con <b>+</b> qui sopra o dalla pagina <button className="btn sm" onClick={() => setView('orgs')}>Org</button></div>
        )}
        {view === 'work' && activeOrg && !shown && (
          <div className="panel empty">
            {tool === 'changeset'
              ? 'Nessun change set aperto. Si aprono qui quando mandi in anteprima le modifiche della matrice, o dallo Storico.'
              : <>Nessun oggetto aperto. <button className="btn sm primary" onClick={() => go(newObjectTab(ws, activeOrg.id, tool === 'layouts' ? 'layouts' : 'matrix'))}>Apri un oggetto</button></>}
          </div>
        )}
        {ws.tabs.filter(t => mounted.has(t.id) || t.id === shown?.id).map(t => {
          const org = orgById(t.orgId);
          return org && (
            <div key={t.id} hidden={t.id !== shown?.id}>
              <TabBody tab={t} org={org}
                onPatch={p => setWs(w => updateTab(w, t.id, p))}
                onClose={() => closeObject(t)}
                onChangeSet={(id, number) => showChangeSet(t.orgId, id, number)}
                onDirty={on => markDirty(t.id, on)} />
            </div>
          );
        })}
      </main>
    </>
  );
}

function TabBody({ tab, org, onPatch, onClose, onChangeSet, onDirty }: {
  tab: WorkTab; org: Org;
  onPatch: (p: Partial<WorkTab>) => void; onClose: () => void; onChangeSet: (id: string, number: string) => void; onDirty: (dirty: boolean) => void;
}) {
  switch (tab.tool) {
    case 'matrix':
      return <MatrixPage org={org} onChangeSet={onChangeSet} initialObjects={tab.objects} onObjectsChange={objects => onPatch({ objects })} onDirtyChange={onDirty} />;
    case 'layouts':
      return <LayoutsPage org={org} initialObject={tab.objects[0] ?? null} initialTab={tab.layoutMode}
        onChange={(object, layoutMode) => onPatch({ objects: object ? [object] : [], layoutMode })} />;
    case 'changeset':
      return tab.changeSetId ? <ChangeSetPage key={tab.changeSetId} id={tab.changeSetId} onOpen={onChangeSet} onBack={onClose} /> : null;
  }
}
