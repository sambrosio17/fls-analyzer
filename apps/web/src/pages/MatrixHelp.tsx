import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useT } from '../i18n.tsx';
import { AccessLegend } from '../AccessLegend.tsx';

// Every demo draws a small grid: a 90px label column, a 30px header row, then cells of CELL_W x CELL_H.
const CELL_W = 48, CELL_H = 30, LEFT = 90, TOP = 30;
const cx = (c: number) => LEFT + c * CELL_W;
const cy = (r: number) => TOP + r * CELL_H;
const at = (r: number, c: number) => ({ left: cx(c), top: cy(r) });
const point = (r: number, c: number) => ({ x: `${cx(c) + CELL_W / 2}px`, y: `${cy(r) + CELL_H / 2}px` });
const vars = (v: Record<string, string | number>) => v as CSSProperties;

/** Access shown in a demo cell; null is an empty cell drawn over by an animation. */
type V = 0 | 1 | 2 | null;
const cls = (v: V) => v === 2 ? 'h-v2' : v === 1 ? 'h-v1' : 'h-v0';

function Grid({ rows, cols, values, below = 0, children }: { rows: string[]; cols: string[]; values: V[][]; below?: number; children?: ReactNode }) {
  const short = useT().access.short;
  return (
    <div className="h-demo" style={{ height: TOP + rows.length * CELL_H + 18 + below, width: LEFT + cols.length * CELL_W + 12 }} aria-hidden="true">
      {cols.map((c, j) => <span key={c} className="h-col" style={{ left: cx(j), top: 2 }}>{c}</span>)}
      {rows.map((r, i) => <span key={r} className="h-row" style={{ left: 0, top: cy(i) }}>{r}</span>)}
      {values.map((row, i) => row.map((v, j) => <span key={`${i}-${j}`} className={`h-cell ${cls(v)}`} style={at(i, j)}>{v === null ? '' : short[v]}</span>))}
      {children}
    </div>
  );
}

type Pt = { x: string; y: string };
const px = (x: number, y: number): Pt => ({ x: `${x}px`, y: `${y}px` });
/** Animated pointer: starts at `from`, goes to `to`, then (for menus) to `then`. */
const Cursor = ({ anim, from, to, then = to }: { anim: string; from: Pt; to: Pt; then?: Pt }) => (
  <span className={`h-cursor ${anim}`} style={vars({ '--x0': from.x, '--y0': from.y, '--x1': to.x, '--y1': to.y, '--x2': then.x, '--y2': then.y })}>
    <svg viewBox="0 0 16 20" width="16" height="20"><path d="M1 1 L1 16 L5 12 L8 19 L11 18 L8 11 L14 11 Z" /></svg>
  </span>
);

const ROWS = ['Phone', 'Rating', 'Revenue'];
const COLS = ['Sales', 'Service', 'Partner'];

/** Click cycles one cell: none, read, read and edit. */
function ClickDemo() {
  const short = useT().access.short;
  return (
    <Grid rows={ROWS} cols={COLS} values={[[1, 0, 1], [2, null, 1], [0, 1, 2]]}>
      <span className="h-cell h-cycle" style={at(1, 1)}>{short.map(v => <b key={v}>{v}</b>)}</span>
      <Cursor anim="h-move-click" from={point(2, 2)} to={point(1, 1)} />
    </Grid>
  );
}

/** Drag over a block, the menu opens, "read and edit" fills the block. */
function DragDemo() {
  const t = useT();
  const [n, r, e] = t.access.short;
  return (
    <Grid rows={[...ROWS, 'Website']} cols={[...COLS, 'Support']} values={[[1, 0, 1, 0], [0, 1, 1, 0], [0, 0, 2, 1], [1, 1, 0, 0]]}>
      <span className="h-range" style={vars({ left: cx(0), top: cy(0), '--w': `${CELL_W * 3}px`, '--h': `${CELL_H * 2}px`, '--w0': `${CELL_W}px`, '--h0': `${CELL_H}px` })} />
      {[0, 1].flatMap(r => [0, 1, 2].map(c => <span key={`${r}${c}`} className="h-cell h-v2 h-fill" style={at(r, c)}>{e}</span>))}
      <span className="h-menu" style={{ left: cx(1) + 10, top: cy(1) + 10 }}>
        <i>{t.help.menuCells(6)}</i><i>{n} {t.access.long[0]}</i><i>{r} {t.access.long[1]}</i><i className="h-pick">{e} {t.access.long[2]}</i>
      </span>
      <Cursor anim="h-drag" from={point(0, 0)} to={point(1, 2)} then={px(cx(1) + 10 + 60, cy(1) + 10 + 63)} />
    </Grid>
  );
}

/** Right click opens the same menu on one cell. */
function RightClickDemo() {
  const t = useT();
  const [n, r, e] = t.access.short;
  return (
    <Grid rows={ROWS} cols={COLS} values={[[1, 0, 1], [2, 1, 1], [0, 1, 2]]}>
      <span className="h-range h-one" style={{ left: cx(2), top: cy(1), width: CELL_W, height: CELL_H }} />
      <span className="h-cell h-v0 h-fill h-fill-late" style={at(1, 2)}>{n}</span>
      <span className="h-menu h-menu-r" style={{ left: cx(1) - 6, top: cy(1) + 18 }}>
        <i>{t.help.menuCell}</i><i className="h-pick">{n} {t.access.long[0]}</i><i>{r} {t.access.long[1]}</i><i>{e} {t.access.long[2]}</i>
      </span>
      <Cursor anim="h-rclick" from={point(0, 0)} to={point(1, 2)} then={px(cx(1) - 6 + 50, cy(1) + 18 + 29)} />
    </Grid>
  );
}

/** Tick a row and a column, then apply an action to their crossing. */
function BulkDemo() {
  const t = useT();
  return (
    <Grid rows={ROWS} cols={COLS} values={[[1, 0, 1], [0, 0, 1], [0, 1, 2]]} below={30}>
      <span className="h-check h-check-row" style={{ left: LEFT - 16, top: cy(1) + 8 }} />
      <span className="h-check h-check-col" style={{ left: cx(1) + 18, top: 16 }} />
      <span className="h-rowband" style={{ left: 0, top: cy(1), width: LEFT + CELL_W * 3 }} />
      <span className="h-colband" style={{ left: cx(1), top: TOP, height: CELL_H * 3 }} />
      <span className="h-cell h-v1 h-fill h-fill-bulk" style={at(1, 1)}>{t.access.short[1]}</span>
      <span className="h-apply" style={{ left: LEFT, top: cy(3) + 10 }}>{t.matrix.applyToSelection}</span>
    </Grid>
  );
}

/** Search "sales" in the profile filter: only matches stay, two get ticked, and only those become columns. */
function FilterDemo() {
  const t = useT();
  const rows = ['Service', 'Sales Manager', 'Partner', 'Sales Rep', 'Sales Ops'];
  let kept = 0;
  return (
    <div className="h-demo h-filter" style={{ height: 196, width: 260 }} aria-hidden="true">
      <span className="h-search"><span className="h-typed" style={vars({ '--chars': '5ch' })}>sales</span><span className="h-caret" /></span>
      {rows.map((r, i) => {
        const keep = r.startsWith('Sales');
        const tick = keep && r !== 'Sales Ops' ? ++kept : 0;
        const to = 44 + rows.slice(0, i).filter(x => x.startsWith('Sales')).length * 24;
        return (
          <span key={r} className={`h-frow${keep ? ' h-keep' : ' h-drop'}`} style={vars({ top: 44 + i * 24, '--to': `${to - (44 + i * 24)}px` })}>
            <span className={`h-cb${tick ? ` h-cb${tick}` : ''}`} />{r}
          </span>
        );
      })}
      <span className="h-pickpill">{t.help.pickPill}</span>
    </div>
  );
}

/** Pending changes go to a preview, then (in production) approval, then Salesforce. */
function FlowDemo() {
  const t = useT();
  const steps = t.help.flow;
  return (
    <div className="h-demo h-flow" style={{ height: 96, width: 380 }} aria-hidden="true">
      {steps.map((s, i) => <span key={s} className={`h-step h-step-${i}`} style={{ left: 8 + i * 94 }}>{s}{i === 0 && <em className="h-badge">3</em>}</span>)}
      {[0, 1, 2].map(i => <span key={i} className="h-arrow" style={{ left: 84 + i * 94 }}>→</span>)}
      <span className="h-note">{t.help.flowNote}</span>
    </div>
  );
}

/** Demos for each guide section, in order; titles and text come from the locale. */
const SECTIONS = [
  { key: 'read', demo: <div className="h-legend"><AccessLegend /></div> },
  { key: 'click', demo: <ClickDemo /> },
  { key: 'drag', demo: <DragDemo /> },
  { key: 'right', demo: <RightClickDemo /> },
  { key: 'bulk', demo: <BulkDemo /> },
  { key: 'filter', demo: <FilterDemo /> },
  { key: 'flow', demo: <FlowDemo /> }
] as const;

/** Animated guide to the FLS matrix, shown in a modal dialog. */
export function MatrixHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="help" aria-labelledby="matrix-help-title" onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose(); }}>
      <div className="help-head">
        <h2 id="matrix-help-title">{t.help.title}</h2>
        <button className="btn sm" onClick={onClose} autoFocus>{t.common.close}</button>
      </div>
      <nav className="help-nav">
        {SECTIONS.map((s, i) => <a key={s.key} href={`#help-${i}`} onClick={e => { e.preventDefault(); document.getElementById(`help-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{t.help.sections[s.key].title}</a>)}
      </nav>
      <div className="help-body">
        {open && SECTIONS.map((s, i) => (
          <section key={s.key} id={`help-${i}`} className="help-sec">
            <div className="help-text"><h3>{t.help.sections[s.key].title}</h3><p>{t.help.sections[s.key].body}</p></div>
            <div className="help-stage">{s.demo}</div>
          </section>
        ))}
      </div>
    </dialog>
  );
}
