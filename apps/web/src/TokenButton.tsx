import { useState, type ReactNode } from 'react';
import { ApiError, api, type Org } from './api.ts';

export type TokenState = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; at: string } | { kind: 'error'; message: string; reauth: boolean };

export const reconnect = (org: Org) => { location.href = `/oauth/start?org=${encodeURIComponent(org.id)}`; };

/** Renews the org's access token with its refresh token; a 409 means Salesforce refused it and the org must log in again. */
export function useTokenRefresh(org: Org) {
  const [state, setState] = useState<TokenState>({ kind: 'idle' });
  const run = async (): Promise<TokenState> => {
    setState({ kind: 'busy' });
    let next: TokenState;
    try {
      const { refreshedAt } = await api.refreshToken(org.id);
      next = { kind: 'ok', at: new Date(refreshedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) };
    } catch (e) {
      next = { kind: 'error', message: (e as Error).message, reauth: e instanceof ApiError && e.status === 409 };
    }
    setState(next);
    return next;
  };
  return { state, run };
}

/** Small icon button for the org tab. */
export function TokenTabButton({ org }: { org: Org }) {
  const { state, run } = useTokenRefresh(org);
  const click = async () => {
    const r = await run();
    if (r.kind === 'error' && r.reauth && window.confirm(`${r.message}\n\nRicollegare ${org.label} adesso?`)) reconnect(org);
  };
  const title = state.kind === 'ok' ? `Token rinnovato alle ${state.at}` : state.kind === 'error' ? state.message : 'Rinnova il token di accesso';
  return (
    <button className={`tab-refresh ${state.kind}`} aria-label={`Rinnova il token di ${org.label}`} title={title} disabled={state.kind === 'busy'} onClick={click}>
      {state.kind === 'ok' ? '✓' : state.kind === 'error' ? '!' : '↻'}
    </button>
  );
}

/** Button and result line for the Org page, laid out by the caller. */
export function TokenRefresh({ org, children }: { org: Org; children: (button: ReactNode, message: ReactNode) => ReactNode }) {
  const { state, run } = useTokenRefresh(org);
  const button = <button className="btn sm" disabled={state.kind === 'busy'} onClick={run}>{state.kind === 'busy' ? 'Rinnovo…' : 'Rinnova token'}</button>;
  const message = state.kind === 'ok' ? <p className="token-msg ok-text">Token di accesso rinnovato alle {state.at}.</p>
    : state.kind === 'error' ? (
      <p className="token-msg err-text">{state.message}{state.reauth && <> <button className="btn sm primary" onClick={() => reconnect(org)}>Ricollega</button></>}</p>
    ) : null;
  return <>{children(button, message)}</>;
}
