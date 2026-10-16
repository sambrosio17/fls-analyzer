import type { ReactNode } from 'react';
import { useLang } from '../i18n.tsx';
import { CHANGELOG, type ChangeDemo } from '../changelog.ts';
import { ApexDemo, LoadDemo, OrgDemo, TabsDemo } from './Guide.tsx';
import { ExportDemo, FlowDemo, MATRIX_SECTIONS } from './MatrixHelp.tsx';

const matrixDemo = (key: string) => MATRIX_SECTIONS.find(s => s.key === key)!.demo;
const DEMOS: Record<ChangeDemo, () => ReactNode> = {
  orgs: () => <OrgDemo />, tabs: () => <TabsDemo />, load: () => <LoadDemo />, apex: () => <ApexDemo />,
  drag: () => matrixDemo('drag'), filter: () => matrixDemo('filter'), export: () => <ExportDemo />, flow: () => <FlowDemo />
};

/** Every change, newest first, grouped by day; each one can open its guide section. */
export function News({ onGuide }: { onGuide: (section: string) => void }) {
  const { lang, t } = useLang();
  const days = [...new Set(CHANGELOG.map(e => e.date))];
  return (
    <div className="news">
      <div className="view-head"><div><h1>{t.news.title}</h1><p>{t.news.intro}</p></div></div>
      {days.map(day => (
        <section key={day} className="panel news-day">
          <h2>{new Date(`${day}T12:00:00`).toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
          {CHANGELOG.filter(e => e.date === day).map(e => (
            <article key={e.prs.join('-')} className={`help-sec${e.demo ? '' : ' no-demo'}`}>
              <div className="help-text">
                <h3>{e.text[lang].title}</h3>
                <p>{e.text[lang].body}</p>
                {e.guide && <button type="button" className="btn sm news-guide" onClick={() => onGuide(e.guide!)}>{t.news.seeGuide}</button>}
              </div>
              {e.demo && <div className="help-stage">{DEMOS[e.demo]()}</div>}
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
