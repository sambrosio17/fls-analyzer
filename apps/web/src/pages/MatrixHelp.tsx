import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

// Every demo draws a small grid: a 90px label column, a 30px header row, then cells of CELL_W x CELL_H.
const CELL_W = 48, CELL_H = 30, LEFT = 90, TOP = 30;
const cx = (c: number) => LEFT + c * CELL_W;
const cy = (r: number) => TOP + r * CELL_H;
const at = (r: number, c: number) => ({ left: cx(c), top: cy(r) });
const point = (r: number, c: number) => ({ x: `${cx(c) + CELL_W / 2}px`, y: `${cy(r) + CELL_H / 2}px` });
const vars = (v: Record<string, string | number>) => v as CSSProperties;

type V = '—' | 'L' | 'L+M' | '';
const cls = (v: V) => v === 'L+M' ? 'h-v2' : v === 'L' ? 'h-v1' : 'h-v0';

function Grid({ rows, cols, values, below = 0, children }: { rows: string[]; cols: string[]; values: V[][]; below?: number; children?: ReactNode }) {
  return (
    <div className="h-demo" style={{ height: TOP + rows.length * CELL_H + 18 + below, width: LEFT + cols.length * CELL_W + 12 }} aria-hidden="true">
      {cols.map((c, j) => <span key={c} className="h-col" style={{ left: cx(j), top: 2 }}>{c}</span>)}
      {rows.map((r, i) => <span key={r} className="h-row" style={{ left: 0, top: cy(i) }}>{r}</span>)}
      {values.map((row, i) => row.map((v, j) => <span key={`${i}-${j}`} className={`h-cell ${cls(v)}`} style={at(i, j)}>{v}</span>))}
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
  return (
    <Grid rows={ROWS} cols={COLS} values={[['L', '—', 'L'], ['L+M', '', 'L'], ['—', 'L', 'L+M']]}>
      <span className="h-cell h-cycle" style={at(1, 1)}><b>—</b><b>L</b><b>L+M</b></span>
      <Cursor anim="h-move-click" from={point(2, 2)} to={point(1, 1)} />
    </Grid>
  );
}

/** Drag over a block, the menu opens, "Lettura e modifica" fills the block. */
function DragDemo() {
  return (
    <Grid rows={[...ROWS, 'Website']} cols={[...COLS, 'Support']} values={[['L', '—', 'L', '—'], ['—', 'L', 'L', '—'], ['—', '—', 'L+M', 'L'], ['L', 'L', '—', '—']]}>
      <span className="h-range" style={vars({ left: cx(0), top: cy(0), '--w': `${CELL_W * 3}px`, '--h': `${CELL_H * 2}px`, '--w0': `${CELL_W}px`, '--h0': `${CELL_H}px` })} />
      {[0, 1].flatMap(r => [0, 1, 2].map(c => <span key={`${r}${c}`} className="h-cell h-v2 h-fill" style={at(r, c)}>L+M</span>))}
      <span className="h-menu" style={{ left: cx(1) + 10, top: cy(1) + 10 }}>
        <i>6 celle</i><i>— Nessun accesso</i><i>L Lettura</i><i className="h-pick">L+M Lettura e modifica</i>
      </span>
      <Cursor anim="h-drag" from={point(0, 0)} to={point(1, 2)} then={px(cx(1) + 10 + 60, cy(1) + 10 + 63)} />
    </Grid>
  );
}

/** Right click opens the same menu on one cell. */
function RightClickDemo() {
  return (
    <Grid rows={ROWS} cols={COLS} values={[['L', '—', 'L'], ['L+M', 'L', 'L'], ['—', 'L', 'L+M']]}>
      <span className="h-range h-one" style={{ left: cx(2), top: cy(1), width: CELL_W, height: CELL_H }} />
      <span className="h-cell h-v0 h-fill h-fill-late" style={at(1, 2)}>—</span>
      <span className="h-menu h-menu-r" style={{ left: cx(1) - 6, top: cy(1) + 18 }}>
        <i>1 cella</i><i className="h-pick">— Nessun accesso</i><i>L Lettura</i><i>L+M Lettura e modifica</i>
      </span>
      <Cursor anim="h-rclick" from={point(0, 0)} to={point(1, 2)} then={px(cx(1) - 6 + 50, cy(1) + 18 + 29)} />
    </Grid>
  );
}

/** Tick a row and a column, then apply an action to their crossing. */
function BulkDemo() {
  return (
    <Grid rows={ROWS} cols={COLS} values={[['L', '—', 'L'], ['—', '—', 'L'], ['—', 'L', 'L+M']]} below={30}>
      <span className="h-check h-check-row" style={{ left: LEFT - 16, top: cy(1) + 8 }} />
      <span className="h-check h-check-col" style={{ left: cx(1) + 18, top: 16 }} />
      <span className="h-rowband" style={{ left: 0, top: cy(1), width: LEFT + CELL_W * 3 }} />
      <span className="h-colband" style={{ left: cx(1), top: TOP, height: CELL_H * 3 }} />
      <span className="h-cell h-v1 h-fill h-fill-bulk" style={at(1, 1)}>L</span>
      <span className="h-apply" style={{ left: LEFT, top: cy(3) + 10 }}>Applica alla selezione</span>
    </Grid>
  );
}

/** Search "sales" in the profile filter: only matches stay, two get ticked, and only those become columns. */
function FilterDemo() {
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
      <span className="h-pickpill">Profili: 2 scelti</span>
    </div>
  );
}

/** Pending changes go to a preview, then (in production) approval, then Salesforce. */
function FlowDemo() {
  const steps = ['Matrice', 'Anteprima', 'Approvazione', 'Applicato'];
  return (
    <div className="h-demo h-flow" style={{ height: 96, width: 380 }} aria-hidden="true">
      {steps.map((s, i) => <span key={s} className={`h-step h-step-${i}`} style={{ left: 8 + i * 94 }}>{s}{i === 0 && <em className="h-badge">3</em>}</span>)}
      {[0, 1, 2].map(i => <span key={i} className="h-arrow" style={{ left: 84 + i * 94 }}>→</span>)}
      <span className="h-note">L'approvazione serve solo in produzione</span>
    </div>
  );
}

const SECTIONS: { title: string; demo: ReactNode; body: ReactNode }[] = [
  {
    title: 'Leggere la matrice',
    demo: (
      <div className="h-legend">
        <span><span className="box">—</span>Nessun accesso</span><span><span className="box b1">L</span>Lettura</span>
        <span><span className="box b2">L+M</span>Lettura e modifica</span><span><span className="box bp" />Modifica in sospeso</span>
        <span><span className="box bl" />Non modificabile</span>
      </div>
    ),
    body: <>Ogni riga è un campo, ogni colonna un profilo o permission set. In testa alla colonna, <b>L</b> e <b>M</b> contano i campi leggibili e modificabili. Le celle tratteggiate non si possono cambiare: campi senza FLS, permission set di pacchetti gestiti, gruppi e muting. "Nascosto a te" indica un campo che il tuo utente non vede.</>
  },
  {
    title: 'Cambiare una cella',
    demo: <ClickDemo />,
    body: <>Un clic fa girare la cella: nessun accesso, lettura, lettura e modifica. I campi formula e di sola lettura passano solo tra nessun accesso e lettura. La cella cambiata diventa viola e ricorda il valore di prima.</>
  },
  {
    title: 'Selezionare più celle trascinando',
    demo: <DragDemo />,
    body: <>Tieni premuto il mouse su una cella e trascina: quando lo rilasci si apre un menu per scegliere l'accesso di tutto il blocco. Vicino ai bordi la tabella scorre da sola. Con <kbd>Shift</kbd> + clic allarghi la selezione fino a un'altra cella, con <kbd>Esc</kbd> la annulli. Dal menu puoi anche ripristinare i valori dell'org.</>
  },
  {
    title: 'Menu con il tasto destro',
    demo: <RightClickDemo />,
    body: <>Il tasto destro apre lo stesso menu sulla cella sotto il mouse, o su tutta la selezione se la cella ne fa parte.</>
  },
  {
    title: 'Azioni in blocco su righe e colonne',
    demo: <BulkDemo />,
    body: <>Spunta i campi a sinistra e i profili in testa alle colonne, scegli l'azione nella barra arancione e premi <b>Applica alla selezione</b>. L'azione vale per tutti gli incroci, anche fuori dallo schermo. "Tutte le colonne" seleziona le colonne filtrate.</>
  },
  {
    title: 'Cercare e filtrare',
    demo: <FilterDemo />,
    body: <>I filtri <b>Campi</b> e <b>Profili e permission set</b> si aprono con un clic: cerca, poi spunta solo i risultati che ti servono. Se cerchi "sales" e trovi tre profili, puoi tenerne due. <b>Spunta i risultati</b> li prende tutti, <b>Svuota</b> o la × tolgono il filtro, e nessuna spunta vuol dire tutti. Ci sono anche i filtri rapidi: campi non visibili a nessuno, modificabili da tutti, solo custom, o con modifiche in sospeso. I conteggi in testa alle colonne seguono i filtri.</>
  },
  {
    title: "Dall'anteprima a Salesforce",
    demo: <FlowDemo />,
    body: <>Nulla viene scritto finché non confermi. <b>Vai all'anteprima</b> crea un change set con le modifiche in sospeso e lo apre in una scheda. In produzione serve un'approvazione e devi scrivere il nome dell'org. Ogni change set si può annullare dallo Storico.</>
  }
];

/** Animated guide to the FLS matrix, shown in a modal dialog. */
export function MatrixHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        <h2 id="matrix-help-title">Come funziona la matrice FLS</h2>
        <button className="btn sm" onClick={onClose} autoFocus>Chiudi</button>
      </div>
      <nav className="help-nav">
        {SECTIONS.map((s, i) => <a key={s.title} href={`#help-${i}`} onClick={e => { e.preventDefault(); document.getElementById(`help-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{s.title}</a>)}
      </nav>
      <div className="help-body">
        {open && SECTIONS.map((s, i) => (
          <section key={s.title} id={`help-${i}`} className="help-sec">
            <div className="help-text"><h3>{s.title}</h3><p>{s.body}</p></div>
            <div className="help-stage">{s.demo}</div>
          </section>
        ))}
      </div>
    </dialog>
  );
}
