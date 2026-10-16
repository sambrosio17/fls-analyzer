import { useEffect, useState, type CSSProperties } from 'react';
import { api, type Org } from './api.ts';
import { Login } from './pages/Login.tsx';
import { Orgs } from './pages/Orgs.tsx';
import { MatrixPage } from './pages/Matrix.tsx';
import { ChangeSetPage } from './pages/ChangeSet.tsx';
import { History } from './pages/History.tsx';
import { LayoutsPage } from './pages/Layouts.tsx';
import { Guide } from './pages/Guide.tsx';
import { News } from './pages/News.tsx';
import { LATEST } from './changelog.ts';
import { Brand } from './Brand.tsx';
import { TokenTabButton } from './TokenButton.tsx';
import { LangPicker, useT } from './i18n.tsx';
import { ExportProgress } from './export/ExportMenu.tsx';
import { LoadNotices } from './LoadNotices.tsx';
import { TabContext, forgetTab, setVisibleTab } from './loads.ts';
import { AccentPicker } from './AccentPicker.tsx';
import { useTabDrag } from './tabDrag.ts';
import { ACCENT_COLORS, accentCss, accentOf, type Accent } from './accents.ts';
import {
  TOOLS, closeOrg, closeTab, groupTabs, loadWorkspace, newObjectTab, openChangeSet, openOrg, pruneOrgs, saveWorkspace,
  APEX_OBJECT, moveOrg, moveTab, selectTab, selectTool, tabTitle, toolOf, updateTab, visibleTab, type WorkTab, type Workspace
} from './workspace.ts';

type View = 'orgs' | 'history' | 'work' | 'guide' | 'news';

const ACCENT_STYLE = accentCss();
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
const NEWS_SEEN = 'orgsmith.newsSeen';
const readSeen = () => { try { return storage?.getItem(NEWS_SEEN) ?? null; } catch { return null; } };

export function App() {
  const t = useT();
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
  // Colour picker opened from an org tab's dot, placed under it.
  const [accentMenu, setAccentMenu] = useState<{ orgId: string; x: number; y: number } | null>(null);
  // Guide section to scroll to when the guide opens from What's new.
  const [guideFocus, setGuideFocus] = useState<string | null>(null);
  const [newsSeen, setNewsSeen] = useState(readSeen);

  const shown = view === 'work' ? visibleTab(ws) : null;

  useEffect(() => { api.session().then(s => setSession(s.authenticated)).catch(() => setSession(false)); }, []);
  useEffect(() => { saveWorkspace(storage, ws); }, [ws]);
  useEffect(() => {
    if (view !== 'news' || newsSeen === LATEST) return;
    setNewsSeen(LATEST);
    try { storage?.setItem(NEWS_SEEN, LATEST); } catch { /* best effort */ }
  }, [view]);
  useEffect(() => { setVisibleTab(shown?.id ?? null); }, [shown?.id]);
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

  // The open org's accent colours the whole work area; other views keep the brand colour.
  useEffect(() => {
    const org = view === 'work' ? orgs?.find(o => o.id === ws.activeOrg) : null;
    const accent = accentOf(org?.accent);
    if (org && accent !== 'ember') document.documentElement.dataset.accent = accent;
    else delete document.documentElement.dataset.accent;
  }, [view, ws.activeOrg, orgs]);
  useEffect(() => {
    if (!accentMenu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as Element).closest?.('.accent-pop')) setAccentMenu(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [accentMenu]);

  const orgDrag = useTabDrag(ws.orgs, (id, before) => setWs(w => moveOrg(w, id, before)));
  const groupIds = ws.activeOrg ? groupTabs(ws, ws.activeOrg, toolOf(ws, ws.activeOrg)).map(x => x.id) : [];
  const tabDrag = useTabDrag(groupIds, (id, before) => setWs(w => moveTab(w, id, before)));

  if (session === null) return null;
  if (!session) return <Login onDone={() => setSession(true)} />;
  if (!orgs) return null;

  const orgById = (id: string | null) => orgs.find(o => o.id === id) ?? null;
  const go = (next: Workspace) => { setWs(next); setView('work'); setOrgMenu(false); };
  const forget = (ids: string[]) => { ids.forEach(forgetTab); forgetDirty(ids); };
  const forgetDirty = (ids: string[]) => setDirty(d => { const n = new Set(d); ids.forEach(id => n.delete(id)); return n; });
  const markDirty = (id: string, on: boolean) => setDirty(d => {
    if (d.has(id) === on) return d;
    const n = new Set(d); if (on) n.add(id); else n.delete(id); return n;
  });
  const closeObject = (tab: WorkTab) => {
    if (dirty.has(tab.id) && !window.confirm(t.app.confirmCloseTab)) return;
    forget([tab.id]); setWs(w => closeTab(w, tab.id));
  };
  const closeOrgTab = (orgId: string) => {
    const ids = ws.tabs.filter(x => x.orgId === orgId).map(x => x.id);
    if (ids.some(id => dirty.has(id)) && !window.confirm(t.app.confirmCloseOrg)) return;
    forget(ids); setWs(w => closeOrg(w, orgId));
  };
  const showChangeSet = (orgId: string, id: string, number?: string) => go(openChangeSet(ws, orgId, id, number));

  const activeOrg = view === 'work' ? orgById(ws.activeOrg) : null;
  const tool = activeOrg ? toolOf(ws, activeOrg.id) : null;
  const setAccent = async (orgId: string, accent: Accent) => {
    const updated = await api.setOrgAccent(orgId, accent);
    setOrgs(list => list?.map(o => o.id === updated.id ? updated : o) ?? list);
  };
  const group = activeOrg && tool ? groupTabs(ws, activeOrg.id, tool) : [];
  const closedOrgs = orgs.filter(o => !ws.orgs.includes(o.id));

  return (
    <>
      <header className="appbar">
        <div className="wrap appbar-row">
          <Brand />
          <nav className="tabs">
            <button className="tab" aria-current={view === 'orgs' ? 'page' : undefined} onClick={() => setView('orgs')}>{t.app.orgs}</button>
            <button className="tab" aria-current={view === 'history' ? 'page' : undefined} onClick={() => setView('history')}>{t.app.history}</button>
            <button className="tab" aria-current={view === 'guide' ? 'page' : undefined} onClick={() => { setGuideFocus(null); setView('guide'); }}>{t.app.guide}</button>
            <button className="tab" aria-current={view === 'news' ? 'page' : undefined} onClick={() => setView('news')}>
              {t.app.news}{newsSeen !== LATEST && <span className="news-dot" role="img" aria-label={t.app.newsUnread} title={t.app.newsUnread} />}
            </button>
          </nav>
          <span className="spacer" />
          <LangPicker />
          <button className="btn sm" onClick={() => api.logout().then(() => setSession(false))}>{t.app.logout}</button>
        </div>
        <div className="wrap orgtabs" role="tablist" aria-label={t.app.openOrgs}>
          {ws.orgs.map(id => {
            const o = orgById(id);
            if (!o) return null;
            const on = view === 'work' && ws.activeOrg === id;
            const changed = ws.tabs.some(x => x.orgId === id && dirty.has(x.id));
            return (
              <div key={id} className={`orgtab${on ? ' on' : ''}${o.isSandbox ? '' : ' prod'}${changed ? ' dirty' : ''}`} title={`${o.name} · ${o.username}`} {...orgDrag(id)}
                style={{ '--org-l': ACCENT_COLORS[accentOf(o.accent)].light, '--org-d': ACCENT_COLORS[accentOf(o.accent)].dark } as CSSProperties}
                onAuxClick={e => { if (e.button === 1) closeOrgTab(id); }}>
                <button className="accent-dot" aria-label={t.accent.change} title={t.accent.change}
                  style={{ '--sw': ACCENT_COLORS[accentOf(o.accent)].dark } as CSSProperties}
                  onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setAccentMenu(accentMenu?.orgId === id ? null : { orgId: id, x: r.left, y: r.bottom + 6 }); }} />
                <button role="tab" aria-selected={on} className="orgtab-label" onClick={() => go(openOrg(ws, id))}>
                  <b>{o.label}</b><span className={`env ${o.isSandbox ? 'sandbox' : 'prod'}`}>{o.isSandbox ? t.common.sandbox : t.common.production}</span>
                </button>
                {on && <TokenTabButton org={o} />}
                <button className="tab-x" aria-label={t.app.closeX(o.label)} onClick={() => closeOrgTab(id)}>×</button>
              </div>
            );
          })}
          <div className="orgtab-add-wrap">
            <button className="tab-add" aria-label={t.app.openOrg} title={t.app.openOrg} aria-expanded={orgMenu} onClick={() => setOrgMenu(!orgMenu)}>+</button>
            {orgMenu && (
              <ul className="menu" role="menu">
                {closedOrgs.map(o => (
                  <li key={o.id}><button role="menuitem" onClick={() => go(openOrg(ws, o.id))}>{o.label} <span className={`env ${o.isSandbox ? 'sandbox' : 'prod'}`}>{o.isSandbox ? t.common.sandbox : t.common.production}</span></button></li>
                ))}
                {closedOrgs.length === 0 && <li className="muted menu-note">{orgs.length ? t.app.allOpen : t.app.noOrgs}</li>}
                <li><button role="menuitem" onClick={() => { setView('orgs'); setOrgMenu(false); }}>{t.app.manageOrgs}</button></li>
              </ul>
            )}
          </div>
        </div>
      </header>

      {activeOrg && tool && (
        <div className="subtabs">
          <div className="wrap tooltabs" role="tablist" aria-label={t.app.toolsLabel}>
            {TOOLS.map(tl => {
              const n = groupTabs(ws, activeOrg.id, tl).length;
              return (
                <button key={tl} role="tab" aria-selected={tl === tool} className={`tooltab${tl === tool ? ' on' : ''}`} onClick={() => go(selectTool(ws, activeOrg.id, tl))}>
                  {t.tools[tl]}{tl === 'changeset' && n > 0 && <span className="count">{n}</span>}
                </button>
              );
            })}
          </div>
          {tool !== 'apex' && <div className="wrap objtabs" role="tablist" aria-label={tool === 'changeset' ? t.app.openChangeSets : t.app.openObjects}>
            {group.map(tab => {
              const on = tab.id === shown?.id;
              const title = tabTitle(tab, t.app);
              return (
                <div key={tab.id} className={`objtab${on ? ' on' : ''}${dirty.has(tab.id) ? ' dirty' : ''}${tab.objects.length || tab.tool === 'changeset' ? '' : ' empty'}`} title={title} {...tabDrag(tab.id)}
                  onAuxClick={e => { if (e.button === 1) closeObject(tab); }}>
                  <button role="tab" aria-selected={on} className="objtab-label" onClick={() => go(selectTab(ws, tab.id))}>{title}</button>
                  <button className="tab-x" aria-label={t.app.closeX(title)} onClick={() => closeObject(tab)}>×</button>
                </div>
              );
            })}
            {tool !== 'changeset' && (
              <button className="tab-add" aria-label={t.app.newObject} title={t.app.newObject} onClick={() => go(newObjectTab(ws, activeOrg.id, tool))}>+</button>
            )}
          </div>}
        </div>
      )}
      {accentMenu && (
        <div className="accent-pop" style={{ left: accentMenu.x, top: accentMenu.y }}>
          <span className="accent-pop-h">{t.accent.label}</span>
          <AccentPicker value={orgById(accentMenu.orgId)?.accent ?? null} onChange={a => { void setAccent(accentMenu.orgId, a); setAccentMenu(null); }} />
        </div>
      )}

      <main className="wrap">
        {view === 'orgs' && (
          <Orgs orgs={orgs} error={oauthError} selectedId={ws.activeOrg}
            onOpen={id => go(openOrg(ws, id))}
            onRemoved={id => { setOrgs(orgs.filter(o => o.id !== id)); setWs(w => closeOrg(w, id)); }}
            onRenamed={updated => setOrgs(orgs.map(o => o.id === updated.id ? updated : o))} />
        )}
        {view === 'guide' && <Guide focus={guideFocus} />}
        {view === 'news' && <News onGuide={section => { setGuideFocus(section); setView('guide'); }} />}
        {view === 'history' && <History orgs={orgs} onOpen={(id, orgId, number) => showChangeSet(orgId, id, number)} />}
        {view === 'work' && !activeOrg && (
          <div className="panel empty">{t.app.noOrgOpen(<button className="btn sm" onClick={() => setView('orgs')}>{t.app.orgs}</button>)}</div>
        )}
        {view === 'work' && activeOrg && !shown && (
          <div className="panel empty">
            {tool === 'changeset'
              ? t.app.noChangeSetOpen
              : <>{t.app.noObjectOpen} <button className="btn sm primary" onClick={() => go(newObjectTab(ws, activeOrg.id, tool ?? 'matrix'))}>{t.app.openObject}</button></>}
          </div>
        )}
        {ws.tabs.filter(tab => mounted.has(tab.id) || tab.id === shown?.id).map(tab => {
          const org = orgById(tab.orgId);
          return org && (
            <div key={tab.id} hidden={tab.id !== shown?.id}>
              <TabContext.Provider value={tab.id}>
                <TabBody tab={tab} org={org}
                  onPatch={p => setWs(w => updateTab(w, tab.id, p))}
                  onClose={() => closeObject(tab)}
                  onChangeSet={(id, number) => showChangeSet(tab.orgId, id, number)}
                  onDirty={on => markDirty(tab.id, on)} />
              </TabContext.Provider>
            </div>
          );
        })}
      </main>
      <div className="toasts">
        <LoadNotices tabs={ws.tabs} orgs={orgs} visibleId={shown?.id ?? null} onOpen={id => go(selectTab(ws, id))} />
        <ExportProgress />
      </div>
      <style>{ACCENT_STYLE}</style>
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
    case 'apex':
      return <MatrixPage mode="apex" org={org} onChangeSet={onChangeSet} initialObjects={[APEX_OBJECT]} onDirtyChange={onDirty} />;
    case 'layouts':
      return <LayoutsPage org={org} initialObject={tab.objects[0] ?? null} initialTab={tab.layoutMode}
        onChange={(object, layoutMode) => onPatch({ objects: object ? [object] : [], layoutMode })} />;
    case 'changeset':
      return tab.changeSetId ? <ChangeSetPage key={tab.changeSetId} id={tab.changeSetId} onOpen={onChangeSet} onBack={onClose} /> : null;
  }
}
