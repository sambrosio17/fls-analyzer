import { useT } from './i18n.tsx';

/** Access boxes and their meaning, shared by the matrix and its guide. */
export function AccessLegend({ apex = false }: { apex?: boolean }) {
  const t = useT();
  const [n, r, e] = t.access.short;
  return (
    <>
      {apex
        ? <><span><span className="box">{t.apex.access.short[0]}</span>{t.apex.access.long[0]}</span><span><span className="box b1">{t.apex.access.short[1]}</span>{t.apex.access.long[1]}</span></>
        : <><span><span className="box">{n}</span>{t.access.long[0]}</span><span><span className="box b1">{r}</span>{t.access.long[1]}</span><span><span className="box b2">{e}</span>{t.access.long[2]}</span></>}
      <span><span className="box bp" />{t.access.pending}</span><span><span className="box bl" />{t.access.locked}</span>
    </>
  );
}
