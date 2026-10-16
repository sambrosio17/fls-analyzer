import { useEffect, type ReactNode } from 'react';
import { useT } from '../i18n.tsx';
import { Cursor, ExportDemo, FlowDemo, MATRIX_SECTIONS, px } from './MatrixHelp.tsx';
import { ACCENT_COLORS } from '../accents.ts';
import type { Messages } from '../locales/en.tsx';

const dot = (c: keyof typeof ACCENT_COLORS) => ({ background: ACCENT_COLORS[c].dark });

/** Org tabs with their colour, the tools row and object tabs; "Lead" is dragged to the front. */
export function TabsDemo() {
  const t = useT();
  return (
    <div className="h-demo g-tabs" style={{ height: 150, width: 300 }} aria-hidden="true">
      <span className="g-bar" />
      <span className="g-org g-on" style={{ left: 8, top: 10 }}><i style={dot('cyan')} />UAT</span>
      <span className="g-org" style={{ left: 92, top: 10 }}><i style={dot('magenta')} />PROD</span>
      <span className="g-tool" style={{ left: 8, top: 52 }}>{t.tools.matrix}</span>
      <span className="g-tool g-off" style={{ left: 100, top: 52 }}>{t.tools.apex}</span>
      <span className="g-obj g-obj-a" style={{ top: 96 }}>Account</span>
      <span className="g-obj g-obj-b" style={{ top: 96 }}>Contact</span>
      <span className="g-obj g-obj-c g-on" style={{ top: 96 }}>Lead</span>
      <Cursor anim="g-drag" from={px(240, 140)} to={px(214, 108)} then={px(40, 108)} />
    </div>
  );
}

/** A matrix loads in one tab, the user moves to another, a notice says it is ready and "Open" goes back. */
export function LoadDemo() {
  const t = useT();
  return (
    <div className="h-demo g-load" style={{ height: 170, width: 300 }} aria-hidden="true">
      <span className="g-obj g-l1" style={{ left: 8, top: 8 }}><i className="spinner g-spin" />Account</span>
      <span className="g-obj g-l2" style={{ left: 104, top: 8 }}>Lead</span>
      <span className="g-sheet" style={{ left: 8, top: 40 }} />
      <span className="g-toast" style={{ left: 96, top: 74 }}>
        <b>{t.tools.matrix} · Account</b>
        <span className="g-trun">{t.loads.load.running}</span>
        <span className="g-tdone">{t.loads.load.done}</span>
        <em>{t.loads.open}</em>
      </span>
      <Cursor anim="g-loadcur" from={px(60, 100)} to={px(140, 20)} then={px(270, 141)} />
    </div>
  );
}

/** Apex classes have two states: a click enables a class for a profile. */
export function ApexDemo() {
  const rows = ['AccountCtrl', 'InvoiceBatch', 'LeadScoring'];
  const cols = ['Sales', 'Service', 'Admin'];
  const on = [[1, 0, 1], [0, 0, 1], [1, 1, 1]];
  return (
    <div className="h-demo" style={{ height: 130, width: 250 }} aria-hidden="true">
      {cols.map((c, j) => <span key={c} className="h-col" style={{ left: 96 + j * 48, top: 2 }}>{c}</span>)}
      {rows.map((r, i) => <span key={r} className="h-row" style={{ left: 0, top: 30 + i * 30 }}>{r}</span>)}
      {on.map((row, i) => row.map((v, j) => (
        <span key={`${i}${j}`} className={`h-cell ${v ? 'h-v2' : 'h-v0'}`} style={{ left: 96 + j * 48, top: 30 + i * 30 }}>{v ? '✓' : '–'}</span>
      )))}
      <span className="h-cell h-v2 g-apex-on" style={{ left: 96 + 48, top: 60 }}>✓</span>
      <Cursor anim="h-move-click" from={px(230, 120)} to={px(96 + 48 + 24, 75)} />
    </div>
  );
}

/** Edit mode on Layouts and pages: a cell gets a new layout, turns purple, then "Go to preview". */
export function LayoutEditDemo() {
  const t = useT();
  const rows = ['Sales', 'Service'];
  const cols = ['Business', 'Partner'];
  return (
    <div className="h-demo g-lay" style={{ height: 150, width: 300 }} aria-hidden="true">
      {cols.map((c, j) => <span key={c} className="h-col g-lay-col" style={{ left: 70 + j * 112, top: 2 }}>{c}</span>)}
      {rows.map((r, i) => <span key={r} className="h-row" style={{ left: 0, top: 26 + i * 34 }}>{r}</span>)}
      {rows.map((r, i) => cols.map((c, j) => i === 0 && j === 1 ? null : (
        <span key={r + c} className="g-lay-cell" style={{ left: 70 + j * 112, top: 26 + i * 34 }}>Account Layout</span>
      )))}
      <span className="g-lay-cell g-lay-edit" style={{ left: 182, top: 26 }}><b>Account Layout</b><b>Partner Layout</b></span>
      <span className="g-lay-bar" style={{ left: 70, top: 108 }}>{t.layouts.toPreview}</span>
      <Cursor anim="h-move-click" from={px(150, 140)} to={px(236, 40)} />
    </div>
  );
}

/** An org card on the Orgs page: alias, environment, colour picker. */
export function OrgDemo() {
  const t = useT();
  const colors = ['ember', 'amber', 'olive', 'emerald', 'cyan', 'blue', 'indigo', 'magenta', 'sand', 'slate'] as const;
  return (
    <div className="h-demo g-orgcard" style={{ height: 110, width: 290 }} aria-hidden="true">
      <span className="g-card" />
      <b className="g-name" style={{ left: 14, top: 12 }}>Acme UAT <em className="env sandbox">{t.common.sandbox}</em></b>
      <span className="g-sws" style={{ left: 14, top: 44 }}>{colors.map(c => <i key={c} className={`g-sw g-sw-${c}`} style={dot(c)} />)}</span>
      <span className="g-tabprev" style={{ left: 14, top: 76 }}><i className="g-tabdot" />Acme UAT</span>
      <Cursor anim="h-move-click" from={px(260, 100)} to={px(14 + 4 * 20 + 8, 52)} />
    </div>
  );
}

type GuideKey = keyof Messages['guide']['sections'];
type MatrixKey = typeof MATRIX_SECTIONS[number]['key'];

/** The guide's chapters; matrix chapters reuse the matrix guide's text and animations. */
const CHAPTERS: { group: keyof Messages['guide']['groups']; items: ({ guide: GuideKey; demo?: ReactNode } | { matrix: MatrixKey })[] }[] = [
  { group: 'start', items: [{ guide: 'orgs', demo: <OrgDemo /> }, { guide: 'tabs', demo: <TabsDemo /> }, { guide: 'notices', demo: <LoadDemo /> }] },
  { group: 'matrix', items: [{ matrix: 'read' }, { matrix: 'click' }, { matrix: 'drag' }, { matrix: 'right' }, { matrix: 'bulk' }, { matrix: 'filter' }] },
  { group: 'tools', items: [{ guide: 'apex', demo: <ApexDemo /> }, { guide: 'layouts', demo: <LayoutEditDemo /> }] },
  { group: 'apply', items: [{ guide: 'changesets', demo: <FlowDemo /> }, { guide: 'export', demo: <ExportDemo /> }, { guide: 'history' }] },
  { group: 'more', items: [{ guide: 'settings' }] }
];

export const GUIDE_IDS = CHAPTERS.flatMap(c => c.items.map(i => 'guide' in i ? i.guide : i.matrix));

/** The whole guide on one page, with a table of contents; `focus` scrolls to a section (from the changelog). */
export function Guide({ focus }: { focus?: string | null }) {
  const t = useT();
  const g = t.guide;
  useEffect(() => {
    if (focus) document.getElementById(`guide-${focus}`)?.scrollIntoView({ block: 'start' });
    else window.scrollTo({ top: 0 });
  }, [focus]);
  const go = (id: string) => document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div className="guide">
      <div className="view-head"><div><h1>{g.title}</h1><p>{g.intro}</p></div></div>
      <div className="guide-grid">
        <nav className="guide-toc" aria-label={g.title}>
          {CHAPTERS.map(c => (
            <div key={c.group}>
              <strong>{g.groups[c.group]}</strong>
              {c.items.map(i => {
                const id = 'guide' in i ? i.guide : i.matrix;
                const title = 'guide' in i ? g.sections[i.guide].title : t.help.sections[i.matrix].title;
                return <a key={id} href={`#guide-${id}`} onClick={e => { e.preventDefault(); go(id); }}>{title}</a>;
              })}
            </div>
          ))}
        </nav>
        <div className="guide-body">
          {CHAPTERS.map(c => (
            <section key={c.group} className="panel guide-group">
              <h2>{g.groups[c.group]}</h2>
              {c.items.map(i => {
                const id = 'guide' in i ? i.guide : i.matrix;
                const s = 'guide' in i ? g.sections[i.guide] : t.help.sections[i.matrix];
                const demo = 'guide' in i ? i.demo : MATRIX_SECTIONS.find(m => m.key === i.matrix)!.demo;
                return (
                  <div key={id} id={`guide-${id}`} className={`help-sec${demo ? '' : ' no-demo'}`}>
                    <div className="help-text"><h3>{s.title}</h3><p>{s.body}</p></div>
                    {demo && <div className="help-stage">{demo}</div>}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
