import { useState, type FormEvent } from 'react';
import { api } from '../api.ts';

export function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try { await api.login(password); onDone(); } catch { setError('Password errata.'); }
  };
  return (
    <main className="wrap login">
      <form className="panel panel-b" onSubmit={submit}>
        <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>FLS Analyzer</div>
        <label className="field"><span>Password</span>
          <input className="input" type="password" id="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit">Entra</button>
      </form>
    </main>
  );
}
