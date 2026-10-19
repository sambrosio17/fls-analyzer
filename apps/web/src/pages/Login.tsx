import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, type User } from '../api.ts';
import { Brand } from '../Brand.tsx';
import { Fox } from '../Fox.tsx';
import { LangPicker, useT } from '../i18n.tsx';

type Mode = 'login' | 'signup' | 'reset';

/** Invite and password reset links open the app with ?invite=… or ?reset=…. */
function linkFromUrl(): { kind: 'invite' | 'reset'; code: string } | null {
  const q = new URLSearchParams(window.location.search);
  const invite = q.get('invite');
  const reset = q.get('reset');
  return invite ? { kind: 'invite', code: invite } : reset ? { kind: 'reset', code: reset } : null;
}

const dropLinkFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  url.searchParams.delete('reset');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
};

/** Log in, create an account (open signup or with an invite) or choose a new password from a reset link. */
export function Login({ signup, onDone }: { signup: 'open' | 'invite'; onDone: (user: User) => void }) {
  const t = useT();
  const l = t.login;
  const [link] = useState(linkFromUrl);
  const [mode, setMode] = useState<Mode>(link?.kind === 'invite' ? 'signup' : link?.kind === 'reset' ? 'reset' : 'login');
  const [linkEmail, setLinkEmail] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!link) return;
    api.link(link.kind, link.code).then(r => { setLinkEmail(r.email); setEmail(r.email); }).catch(() => {
      setError(l.errors.LINK_INVALID);
      setMode('login');
      dropLinkFromUrl();
    });
  }, []);

  const message = (e: unknown) => {
    const code = e instanceof ApiError ? e.code : undefined;
    if (code && code in l.errors) return l.errors[code as keyof typeof l.errors];
    if (e instanceof ApiError && e.status === 400) return l.errors.INVALID;
    return e instanceof Error ? e.message : String(e);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const s = mode === 'login' ? await api.login(email, password)
        : mode === 'signup' ? await api.signup({ name, email, password, ...(link?.kind === 'invite' && linkEmail ? { invite: link.code } : {}) })
        : await api.resetPassword(link!.code, password);
      dropLinkFromUrl();
      onDone(s.user!);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (m: Mode) => { setMode(m); setError(null); };
  const canSignUp = signup === 'open' || (link?.kind === 'invite' && !!linkEmail);

  return (
    <main className="wrap login">
      <Fox className="fox login-fox" />
      <form className="panel panel-b" onSubmit={submit}>
        <div className="row login-head"><Brand /><span className="spacer" /><LangPicker /></div>
        <h1 className="login-title">{mode === 'login' ? l.loginTitle : mode === 'signup' ? l.signupTitle : l.resetTitle}</h1>
        {mode === 'signup' && <p className="muted small">{linkEmail ? l.invited(linkEmail) : l.signupIntro}</p>}
        {mode === 'signup' && (
          <label className="field"><span>{l.name}</span>
            <input className="input" id="name" autoComplete="name" required maxLength={80} autoFocus value={name} onChange={e => setName(e.target.value)} />
          </label>
        )}
        <label className="field"><span>{l.email}</span>
          <input className="input" type="email" id="email" autoComplete={mode === 'login' ? 'username' : 'email'} required autoFocus={mode === 'login'}
            readOnly={!!linkEmail && mode !== 'login'} value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="field"><span>{mode === 'reset' ? l.newPassword : l.password}</span>
          <input className="input" type="password" id="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required
            minLength={mode === 'login' ? undefined : 12} autoFocus={mode === 'reset'} value={password} onChange={e => setPassword(e.target.value)} />
          {mode !== 'login' && <small className="muted">{l.passwordHint}</small>}
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>{mode === 'login' ? l.submit : mode === 'signup' ? l.signupSubmit : l.resetSubmit}</button>
        {mode === 'login' && canSignUp && <button type="button" className="linklike small" onClick={() => switchTo('signup')}>{l.toSignup}</button>}
        {mode === 'login' && signup === 'invite' && !canSignUp && <p className="muted small">{l.inviteOnly}</p>}
        {mode === 'login' && <p className="muted small">{l.forgot}</p>}
        {mode !== 'login' && <button type="button" className="linklike small" onClick={() => switchTo('login')}>{l.toLogin}</button>}
      </form>
    </main>
  );
}
