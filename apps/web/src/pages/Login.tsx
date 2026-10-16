import { useState, type FormEvent } from 'react';
import { api } from '../api.ts';
import { Brand } from '../Brand.tsx';
import { LangPicker, useT } from '../i18n.tsx';

export function Login({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try { await api.login(password); onDone(); } catch { setError(t.login.wrong); }
  };
  return (
    <main className="wrap login">
      <form className="panel panel-b" onSubmit={submit}>
        <div className="row login-head"><Brand /><span className="spacer" /><LangPicker /></div>
        <label className="field"><span>{t.login.password}</span>
          <input className="input" type="password" id="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit">{t.login.submit}</button>
      </form>
    </main>
  );
}
