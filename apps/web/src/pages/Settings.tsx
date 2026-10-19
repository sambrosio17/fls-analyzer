import { useState, type FormEvent } from 'react';
import { api, ApiError, type User } from '../api.ts';
import { useT } from '../i18n.tsx';
import { LAYOUT_VIEWS, MATRIX_VIEWS, useViews, type LayoutView, type MatrixView } from '../views.ts';

const PATTERN = [2, 1, 0, 2, 1, 1, 0, 2, 2, 0, 1, 2, 0, 1, 1, 2, 0, 0, 2, 1, 1, 2, 0, 1];
const COLORS = ['var(--accent)', '#2F7D8C', '#7A5CC2', '#1D7F47'];

/** A small drawing of each view, so the choice is visible before trying it. */
export function ViewPicture({ view }: { view: MatrixView | LayoutView }) {
  switch (view) {
    case 'grid':
      return <span className="vp vp-grid">{PATTERN.slice(0, 12).map((v, n) => <i key={n} className={`v${v}`}>{['', 'R', 'RE'][v]}</i>)}</span>;
    case 'focus':
      return <span className="vp vp-focus"><span className="vp-side">{[0, 1, 2, 3].map(n => <i key={n} className={n === 1 ? 'on' : ''} />)}</span>
        <span className="vp-rows">{[1, 2, 0, 2].map((v, n) => <span key={n}><b /><em>{[0, 1, 2].map(k => <i key={k} className={k === v ? `on v${k}` : ''} />)}</em></span>)}</span></span>;
    case 'dense':
      return <span className="vp vp-dense">{[...PATTERN, ...PATTERN, ...PATTERN.slice(0, 12)].map((v, n) => <i key={n} className={`v${v}`} />)}</span>;
    case 'rules':
      return <span className="vp vp-rules"><span><i className="tok" /><i className="txt" /><i className="tok" /><i className="txt" /><i className="tok" /></span><span className="vp-n"><b>+18</b><b className="dn">−2</b></span></span>;
    case 'table':
      return <span className="vp vp-table">{[0, 1, 2, 3].map(r => <span key={r}>{[0, 1, 2].map(c => <i key={c} />)}</span>)}</span>;
    case 'paint':
      return <span className="vp vp-paint"><span className="vp-pal">{COLORS.map(c => <i key={c} style={{ background: c }} />)}</span>
        {[0, 1, 2].map(r => <span key={r}>{[0, 1, 2].map(c => <i key={c} style={{ background: COLORS[(r * 2 + c) % 3] }} />)}</span>)}</span>;
    case 'board':
      return <span className="vp vp-board">{[3, 1, 2].map((n, l) => <span key={l} style={{ borderTopColor: COLORS[l] }}>{Array.from({ length: n }, (_, k) => <i key={k} />)}</span>)}</span>;
  }
}

/** Name and password of the signed-in account. */
function AccountSettings({ user, onUser }: { user: User; onUser: (u: User) => void }) {
  const t = useT();
  const a = t.settings.account;
  const [name, setName] = useState(user.name);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async (e: FormEvent, body: Parameters<typeof api.updateAccount>[0], done: string) => {
    e.preventDefault();
    setNote(null);
    try {
      onUser(await api.updateAccount(body));
      setCurrent(''); setNext('');
      setNote({ ok: true, text: done });
    } catch (err) {
      setNote({ ok: false, text: err instanceof ApiError && err.code === 'WRONG_PASSWORD' ? t.login.errors.WRONG_PASSWORD : err instanceof ApiError && err.status === 400 ? t.login.errors.INVALID : String((err as Error).message) });
    }
  };
  return (
    <section className="panel settings-group">
      <div className="panel-h"><h2>{a.title}</h2><span className="muted small">{user.email}</span></div>
      <div className="account-forms">
        <form onSubmit={e => save(e, { name }, a.saved)}>
          <label className="field"><span>{a.name}</span>
            <input className="input" id="account-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} />
          </label>
          <button className="btn sm" type="submit" disabled={!name.trim() || name.trim() === user.name}>{a.save}</button>
        </form>
        <form onSubmit={e => save(e, { currentPassword: current, newPassword: next }, a.passwordChanged)}>
          <label className="field"><span>{a.currentPassword}</span>
            <input className="input" type="password" id="current-password" autoComplete="current-password" required value={current} onChange={e => setCurrent(e.target.value)} />
          </label>
          <label className="field"><span>{a.newPassword}</span>
            <input className="input" type="password" id="new-password" autoComplete="new-password" required minLength={12} value={next} onChange={e => setNext(e.target.value)} />
            <small className="muted">{t.login.passwordHint}</small>
          </label>
          <button className="btn sm" type="submit">{a.changePassword}</button>
        </form>
      </div>
      {note && <p className={note.ok ? 'muted small' : 'error'} role="status">{note.text}</p>}
    </section>
  );
}

/** Settings: the account, and how the permission matrices and the layout assignments are shown. */
export function Settings({ user, onUser }: { user: User | null; onUser: (u: User) => void }) {
  const t = useT();
  const s = t.settings;
  const [views, setViews] = useViews();
  const group = <K extends 'matrix' | 'layouts'>(kind: K, list: readonly (K extends 'matrix' ? MatrixView : LayoutView)[]) => (
    <section className="panel settings-group">
      <div className="panel-h"><h2>{kind === 'matrix' ? s.matrix : s.layouts}</h2></div>
      <div className="view-cards" role="radiogroup" aria-label={kind === 'matrix' ? s.matrix : s.layouts}>
        {list.map(v => {
          const text = kind === 'matrix' ? t.views.matrix[v as MatrixView] : t.views.layouts[v as LayoutView];
          const on = views[kind] === v;
          return (
            <label key={v} className={`view-card${on ? ' on' : ''}`}>
              <input type="radio" name={`views-${kind}`} id={`views-${kind}-${v}`} checked={on} onChange={() => setViews({ [kind]: v })} />
              <ViewPicture view={v} />
              <span className="view-card-t"><b>{text.name}</b>{on && <span className="pill st-ok">{s.current}</span>}</span>
              <span className="muted small">{text.desc}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
  return (
    <div className="settings">
      <div className="view-head"><div><h1>{s.title}</h1><p>{s.intro}</p></div></div>
      {user && <AccountSettings user={user} onUser={onUser} />}
      {group('matrix', MATRIX_VIEWS)}
      {group('layouts', LAYOUT_VIEWS)}
      <p className="muted small">{s.language}</p>
    </div>
  );
}
