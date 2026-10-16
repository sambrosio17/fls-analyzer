import type { CSSProperties } from 'react';
import { useT } from './i18n.tsx';
import { dismissLoad, useLoads } from './loads.ts';
import { ACCENT_COLORS, accentOf } from './accents.ts';
import { tabTitle, type WorkTab } from './workspace.ts';
import type { Org } from './api.ts';

/** Notices for slow work in tabs that are not on screen; "Open" goes back to the tab. */
export function LoadNotices({ tabs, orgs, visibleId, onOpen }: { tabs: WorkTab[]; orgs: Org[]; visibleId: string | null; onOpen: (tabId: string) => void }) {
  const t = useT();
  const loads = useLoads().filter(l => l.tabId !== visibleId);
  return <>
    {loads.map(l => {
      const tab = tabs.find(x => x.id === l.tabId);
      const org = tab && orgs.find(o => o.id === tab.orgId);
      if (!tab || !org) return null;
      const c = ACCENT_COLORS[accentOf(org.accent)];
      const what = tab.tool === 'changeset' ? tabTitle(tab, t.app) : `${t.tools[tab.tool]} · ${tabTitle(tab, t.app)}`;
      const status = t.loads[l.kind][l.status];
      return (
        <div key={l.id} className={`export-toast load-toast ${l.status}`} role="status" aria-live="polite">
          <div className="export-toast-h">
            <strong>{what}</strong>
            {l.status !== 'running' && <button type="button" className="export-toast-x" aria-label={t.common.close} onClick={() => dismissLoad(l.id)}>×</button>}
          </div>
          <div className="load-org"><span className="load-dot" style={{ '--sw-l': c.light, '--sw-d': c.dark } as CSSProperties} />{org.label}</div>
          {l.status === 'running' && <div className="export-bar wait" role="progressbar"><span /></div>}
          <div className="export-toast-sub load-foot">
            <span className={l.status === 'error' ? 'err-text' : undefined}>{status}</span>
            <button type="button" className="btn sm" onClick={() => onOpen(l.tabId)}>{t.loads.open}</button>
          </div>
          {l.message && <p className="err-text">{l.message}</p>}
        </div>
      );
    })}
  </>;
}
