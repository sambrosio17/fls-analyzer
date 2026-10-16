import { useT } from './i18n.tsx';
import { LAYOUT_VIEWS, MATRIX_VIEWS, useViews, type LayoutView, type MatrixView } from './views.ts';

/** "View" picker at the top of a tool; the same choice as in Settings. */
export function ViewSwitch({ kind }: { kind: 'matrix' | 'layouts' }) {
  const t = useT();
  const [views, setViews] = useViews();
  const id = `view-${kind}`;
  return (
    <label className="view-switch" htmlFor={id}>
      <span className="muted small">{t.views.label}</span>
      {kind === 'matrix'
        ? <select className="input sm" id={id} value={views.matrix} onChange={e => setViews({ matrix: e.target.value as MatrixView })}>
            {MATRIX_VIEWS.map(v => <option key={v} value={v}>{t.views.matrix[v].name}</option>)}
          </select>
        : <select className="input sm" id={id} value={views.layouts} onChange={e => setViews({ layouts: e.target.value as LayoutView })}>
            {LAYOUT_VIEWS.map(v => <option key={v} value={v}>{t.views.layouts[v].name}</option>)}
          </select>}
    </label>
  );
}
