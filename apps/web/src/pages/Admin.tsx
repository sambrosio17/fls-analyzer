import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, type AdminOverview, type AdminUser, type User } from '../api.ts';
import { useT } from '../i18n.tsx';

/** A link made for someone (invite or password reset), shown once with a button to copy it. */
function LinkBox({ link, note, onClose }: { link: string; note: string; onClose: () => void }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => undefined);
  return (
    <div className="link-box" role="status">
      <p className="small">{note}</p>
      <div className="row">
        <input className="input mono" readOnly value={link} onFocus={e => e.currentTarget.select()} aria-label={t.admin.link} />
        <button className="btn sm" type="button" onClick={copy}>{copied ? t.admin.copied : t.admin.copy}</button>
        <button className="btn sm" type="button" onClick={onClose}>{t.common.close}</button>
      </div>
    </div>
  );
}

/** Admin page: invite people, see every account, reset passwords, close sessions, disable accounts. */
export function Admin({ me }: { me: User }) {
  const t = useT();
  const a = t.admin;
  const [data, setData] = useState<AdminOverview | null>(null);
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(14);
  const [link, setLink] = useState<{ url: string; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.admin.overview().then(setData).catch(e => setError(String((e as Error).message)));
  useEffect(() => { load(); }, []);

  const message = (e: unknown) => {
    const code = e instanceof ApiError ? e.code : undefined;
    return code && code in a.errors ? a.errors[code as keyof typeof a.errors] : e instanceof Error ? e.message : String(e);
  };
  /** Runs an admin action, then reloads the lists. */
  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try { await fn(); await load(); } catch (e) { setError(message(e)); } finally { setBusy(false); }
  };

  const invite = (e: FormEvent) => {
    e.preventDefault();
    act(async () => {
      const { link: url } = await api.admin.invite(email, days);
      setLink({ url, note: a.inviteReady(email.trim().toLowerCase(), days) });
      setEmail('');
    });
  };
  const reset = (u: AdminUser) => act(async () => setLink({ url: (await api.admin.resetLink(u.id)).link, note: a.resetReady(u.email) }));
  const disable = (u: AdminUser) => { if (u.disabled || window.confirm(a.confirmDisable(u.email))) act(() => api.admin.updateUser(u.id, { disabled: !u.disabled })); };
  const toggleAdmin = (u: AdminUser) => { if (u.isAdmin || window.confirm(a.confirmAdmin(u.email))) act(() => api.admin.updateUser(u.id, { isAdmin: !u.isAdmin })); };
  const date = (iso: string | null) => iso ? new Date(iso).toLocaleString(t.locale, { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <div className="admin">
      <div className="view-head"><div><h1>{a.title}</h1><p>{a.intro}</p></div></div>
      {error && <p className="error" role="alert">{error}</p>}

      <section className="panel settings-group">
        <div className="panel-h"><h2>{a.inviteTitle}</h2><span className="muted small">{data?.signup === 'open' ? a.signupOpen : a.signupInvite}</span></div>
        <form className="admin-invite" onSubmit={invite}>
          <label className="field"><span>{a.email}</span>
            <input className="input" type="email" id="invite-email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={a.placeholder} />
          </label>
          <label className="field"><span>{a.validFor}</span>
            <select className="input" id="invite-days" value={days} onChange={e => setDays(Number(e.target.value))}>
              {[3, 7, 14, 30].map(d => <option key={d} value={d}>{a.days(d)}</option>)}
            </select>
          </label>
          <button className="btn primary" type="submit" disabled={busy}>{a.createInvite}</button>
        </form>
        {link && <LinkBox link={link.url} note={link.note} onClose={() => setLink(null)} />}
      </section>

      <section className="panel settings-group">
        <div className="panel-h"><h2>{a.usersTitle}</h2><span className="muted small">{data ? a.count(data.users.length) : t.common.loading}</span></div>
        <div className="tbl-wrap">
          <table className="dt">
            <thead><tr>{a.userCols.map(c => <th key={c}>{c}</th>)}<th /></tr></thead>
            <tbody>
              {data?.users.map(u => {
                const self = u.email === me.email;
                return (
                  <tr key={u.id} className={u.disabled ? 'muted' : ''}>
                    <td><b>{u.name}</b>{self && <span className="muted"> · {a.you}</span>}<br /><span className="muted small">{u.email}</span></td>
                    <td>
                      {u.isAdmin && <span className="pill st-info">{a.adminTag}</span>} {u.disabled ? <span className="pill st-err">{a.disabledTag}</span> : <span className="pill st-ok">{a.activeTag}</span>}
                    </td>
                    <td>{date(u.createdAt)}</td>
                    <td>{date(u.lastLoginAt)}</td>
                    <td>{u.orgs} · {u.changeSets}</td>
                    <td>{u.sessions}</td>
                    <td className="admin-actions">
                      {!self && (
                        <>
                          <button className="btn sm" disabled={busy || u.disabled} onClick={() => reset(u)}>{a.resetLink}</button>
                          <button className="btn sm" disabled={busy || !u.sessions} onClick={() => act(() => api.admin.logoutUser(u.id))}>{a.logout}</button>
                          <button className="btn sm" disabled={busy} onClick={() => toggleAdmin(u)}>{u.isAdmin ? a.removeAdmin : a.makeAdmin}</button>
                          <button className={`btn sm${u.disabled ? '' : ' danger'}`} disabled={busy} onClick={() => disable(u)}>{u.disabled ? a.enable : a.disable}</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel settings-group">
        <div className="panel-h"><h2>{a.invitesTitle}</h2></div>
        <div className="tbl-wrap">
          <table className="dt">
            <thead><tr>{a.inviteCols.map(c => <th key={c}>{c}</th>)}<th /></tr></thead>
            <tbody>
              {data?.invites.map(i => (
                <tr key={i.id}>
                  <td>{i.email}</td>
                  <td>{date(i.createdAt)}{i.createdBy && <><br /><span className="muted small">{i.createdBy}</span></>}</td>
                  <td>{date(i.expiresAt)}</td>
                  <td><span className={`pill${i.status === 'used' ? ' st-ok' : i.status === 'pending' ? ' st-part' : ''}`}>{a.status[i.status]}</span>{i.usedAt && <span className="muted small"> {date(i.usedAt)}</span>}</td>
                  <td>{i.status === 'pending' && <button className="btn sm" disabled={busy} onClick={() => act(() => api.admin.revokeInvite(i.id))}>{a.revoke}</button>}</td>
                </tr>
              ))}
              {data?.invites.length === 0 && <tr><td colSpan={5} className="muted">{a.noInvites}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
