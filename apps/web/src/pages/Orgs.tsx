import { useState, type FormEvent } from 'react';
import { api, type Org } from '../api.ts';
import { TokenRefresh } from '../TokenButton.tsx';
import { useT } from '../i18n.tsx';
import { AccentPicker } from '../AccentPicker.tsx';
import { ACCENT_COLORS, accentOf } from '../accents.ts';

interface Props {
  orgs: Org[];
  error: string | null;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onRemoved: (id: string) => void;
  onRenamed: (org: Org) => void;
}

export function Orgs({ orgs, error, selectedId, onOpen, onRemoved, onRenamed }: Props) {
  const t = useT();
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
    if (!window.confirm(t.orgs.confirmDisconnect(o.label))) return;
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
        <h1>{t.orgs.title}</h1>
        <p>{t.orgs.intro}</p>
      </div></div>
      {error && <div className="banner prod">{t.orgs.connectFailed(error)}</div>}
      <div className="two-col">
        <section className="panel">
          <div className="panel-h"><h2>{t.orgs.connected}</h2><span className="muted">{orgs.length}</span></div>
          <div className="panel-b stack">
            {orgs.length === 0 && <p className="muted">{t.orgs.none}</p>}
            {orgs.map(o => (
              <TokenRefresh org={o} key={o.id}>{(tokenButton, tokenMessage) => (
              <div className="org-card">
                <span className="dot" style={{ background: ACCENT_COLORS[accentOf(o.accent)].light }} />
                <div>
                  {editing?.id === o.id ? (
                    <form className="row" onSubmit={rename}>
                      <input className="input" id={`alias-${o.id}`} aria-label={t.orgs.alias} autoFocus required maxLength={40} value={editing.alias} onChange={e => setEditing({ id: o.id, alias: e.target.value })} />
                      <button className="btn sm primary" type="submit">{t.common.save}</button>
                      <button className="btn sm" type="button" onClick={() => { setEditing(null); setRenameError(null); }}>{t.common.cancel}</button>
                    </form>
                  ) : (
                    <h3>{o.label} <span className={`env ${o.isSandbox ? 'sandbox' : 'prod'}`}>{o.isSandbox ? t.common.sandbox : t.common.production}</span></h3>
                  )}
                  {editing?.id === o.id && renameError && <p className="err-text">{renameError}</p>}
                  <p>{o.alias && <>{o.name} · </>}<span className="mono">{o.username}</span>{o.lastSyncAt && t.orgs.readAt(new Date(o.lastSyncAt).toLocaleString(t.locale))}</p>
                  <div className="org-accent"><span className="muted">{t.accent.color}</span>
                    <AccentPicker id={`accent-${o.id}`} value={o.accent} onChange={a => api.setOrgAccent(o.id, a).then(onRenamed)} /></div>
                </div>
                <div className="row">
                  {tokenButton}
                  <button className="btn sm" onClick={() => setEditing({ id: o.id, alias: o.alias ?? '' })}>{o.alias ? t.orgs.rename : t.orgs.addAlias}</button>
                  <button className="btn sm" onClick={() => remove(o)}>{t.orgs.disconnect}</button>
                  <button className={`btn sm ${o.id === selectedId ? '' : 'primary'}`} onClick={() => onOpen(o.id)}>{t.common.open}</button>
                </div>
                {tokenMessage}
              </div>
              )}</TokenRefresh>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-h"><h2>{t.orgs.connectNew}</h2></div>
          <form className="panel-b" onSubmit={connect}>
            <label className="field"><span>{t.orgs.alias}</span>
              <input className="input" id="alias" required maxLength={40} placeholder={t.orgs.aliasPlaceholder} value={alias} onChange={e => setAlias(e.target.value)} />
              <small className="muted">{t.orgs.aliasHelp}</small>
            </label>
            <div className="field"><span>{t.orgs.environment}</span>
              <div className="seg">
                {([['production', t.common.production], ['sandbox', t.common.sandbox], ['custom', t.orgs.myDomain]] as const).map(([v, l]) => (
                  <label key={v}><input type="radio" name="env" id={`env-${v}`} checked={env === v} onChange={() => setEnv(v)} />{l}</label>
                ))}
              </div>
            </div>
            {env === 'custom' && (
              <label className="field"><span>{t.orgs.myDomain}</span>
                <input className="input mono" id="domain" required placeholder="acme.my.salesforce.com" value={domain} onChange={e => setDomain(e.target.value)} />
              </label>
            )}
            <div className="field"><span>{t.orgs.permsNeeded}</span>
              <ul className="req-list"><li>API Enabled</li><li>View Setup and Configuration</li><li>{t.orgs.permManage}</li></ul>
            </div>
            <button className="btn primary" type="submit">{t.orgs.login}</button>
          </form>
        </section>
      </div>
    </>
  );
}
