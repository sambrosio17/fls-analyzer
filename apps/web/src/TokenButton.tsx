import { useState, type ReactNode } from 'react';
import { ApiError, api, type Org } from './api.ts';
import { useT } from './i18n.tsx';

export type TokenState = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; at: string } | { kind: 'error'; message: string; reauth: boolean };

export const reconnect = (org: Org) => { location.href = `/oauth/start?org=${encodeURIComponent(org.id)}`; };

/** Renews the org's access token with its refresh token; a 409 means Salesforce refused it and the org must log in again. */
export function useTokenRefresh(org: Org) {
  const t = useT();
  const [state, setState] = useState<TokenState>({ kind: 'idle' });
  const run = async (): Promise<TokenState> => {
    setState({ kind: 'busy' });
    let next: TokenState;
    try {
      const { refreshedAt } = await api.refreshToken(org.id);
      next = { kind: 'ok', at: new Date(refreshedAt).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' }) };
    } catch (e) {
      const reauth = e instanceof ApiError && e.status === 409;
      next = { kind: 'error', message: reauth ? t.token.refused((e as ApiError).detail ?? (e as Error).message) : (e as Error).message, reauth };
    }
    setState(next);
    return next;
  };
  return { state, run };
}

/** Small icon button for the org tab. */
export function TokenTabButton({ org }: { org: Org }) {
  const t = useT();
  const { state, run } = useTokenRefresh(org);
  const click = async () => {
    const r = await run();
    if (r.kind === 'error' && r.reauth && window.confirm(`${r.message}\n\n${t.token.reconnectNow(org.label)}`)) reconnect(org);
  };
  const title = state.kind === 'ok' ? t.token.renewedAt(state.at) : state.kind === 'error' ? state.message : t.token.renewTitle;
  return (
    <button className={`tab-refresh ${state.kind}`} aria-label={t.token.renewOf(org.label)} title={title} disabled={state.kind === 'busy'} onClick={click}>
      {state.kind === 'ok' ? '✓' : state.kind === 'error' ? '!' : '↻'}
    </button>
  );
}

/** Button and result line for the Org page, laid out by the caller. */
export function TokenRefresh({ org, children }: { org: Org; children: (button: ReactNode, message: ReactNode) => ReactNode }) {
  const t = useT();
  const { state, run } = useTokenRefresh(org);
  const button = <button className="btn sm" disabled={state.kind === 'busy'} onClick={run}>{state.kind === 'busy' ? t.token.renewing : t.token.renew}</button>;
  const message = state.kind === 'ok' ? <p className="token-msg ok-text">{t.token.renewedMsg(state.at)}</p>
    : state.kind === 'error' ? (
      <p className="token-msg err-text">{state.message}{state.reauth && <> <button className="btn sm primary" onClick={() => reconnect(org)}>{t.token.reconnect}</button></>}</p>
    ) : null;
  return <>{children(button, message)}</>;
}
