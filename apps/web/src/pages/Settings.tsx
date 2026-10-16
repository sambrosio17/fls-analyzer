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

/** Settings: how the permission matrices and the layout assignments are shown. */
export function Settings() {
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
      {group('matrix', MATRIX_VIEWS)}
      {group('layouts', LAYOUT_VIEWS)}
      <p className="muted small">{s.language}</p>
    </div>
  );
}
