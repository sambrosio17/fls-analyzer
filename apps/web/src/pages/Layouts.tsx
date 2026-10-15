import { useEffect, useId, useMemo, useState } from 'react';
import { effectivePage, unassignedPages, type PageSource } from '@fls/core';
import { api, type LayoutAnalysis, type Org, type PageAnalysis, type RecordTypeInfo, type SObject } from '../api.ts';

type Tab = 'layouts' | 'pages';

interface Props { org: Org; initialObject?: string | null; initialTab?: Tab; onChange?: (object: string | null, tab: Tab) => void }

export function LayoutsPage({ org, initialObject = null, initialTab = 'layouts', onChange }: Props) {
  const [objects, setObjects] = useState<SObject[]>([]);
  const [object, setObject] = useState<string | null>(initialObject);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>(initialTab);
  const radio = useId();
  useEffect(() => { onChange?.(object, tab); }, [object, tab]);
  const [layouts, setLayouts] = useState<LayoutAnalysis | null>(null);
  const [pages, setPages] = useState<PageAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.objects(org.id).then(setObjects).catch(e => setError(e.message)); }, [org.id]);

  useEffect(() => {
    if (!object) return;
    if (tab === 'layouts' ? layouts?.object === object : pages?.object === object) return;
    setLoading(true); setError(null);
    const load = tab === 'layouts' ? api.layouts(org.id, object).then(setLayouts) : api.lightningPages(org.id, object).then(setPages);
    load.catch(e => setError((e as Error).message)).finally(() => setLoading(false));
  }, [org.id, object, tab]);

  const matches = query.length < 2 ? [] : objects.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) || o.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const current = tab === 'layouts' ? layouts : pages;

  return (
    <>
      <div className="view-head">
        <div><div className="eyebrow">{org.label}</div><h1>Layout e Lightning page</h1>
          <p>Per ogni oggetto: quale page layout e quale Lightning page vede ogni profilo, per record type. In questa versione la sezione è in sola lettura.</p></div>
      </div>

      <section className="panel panel-b object-picker">
        <div className="row">
          {object && <span className="chip on">{object}</span>}
          <div className="combo">
            <input className="input" id="layout-object" placeholder={object ? 'Cambia oggetto' : 'Scegli un oggetto (es. Account)'} value={query} onChange={e => setQuery(e.target.value)} />
            {matches.length > 0 && (
              <ul className="combo-list">
                {matches.map(o => (
                  <li key={o.name}><button onClick={() => { setQuery(''); setObject(o.name); }}>{o.label} <span className="mono muted">{o.name}</span></button></li>
                ))}
              </ul>
            )}
          </div>
          <span className="spacer" />
          <div className="seg" role="tablist">
            <label><input type="radio" name={radio} id="tab-layouts" checked={tab === 'layouts'} onChange={() => setTab('layouts')} />Page layout</label>
            <label><input type="radio" name={radio} id="tab-pages" checked={tab === 'pages'} onChange={() => setTab('pages')} />Lightning page</label>
          </div>
        </div>
      </section>

      {error && <div className="banner prod">{error}</div>}
      {loading && <p className="muted">Lettura di {tab === 'layouts' ? 'layout e assegnazioni' : 'Lightning page e assegnazioni'}…</p>}
      {!object && <div className="panel empty">Scegli un oggetto per vedere layout e Lightning page.</div>}
      {object && !loading && current?.object === object && (tab === 'layouts' ? <LayoutView data={layouts!} /> : <PageView data={pages!} />)}
    </>
  );
}

interface FilterState { profile: string; recordType: string; target: string; onlyIssues: boolean }
const NO_FILTER: FilterState = { profile: '', recordType: '', target: '', onlyIssues: false };
const rtKey = (rt: RecordTypeInfo) => rt.id ?? 'master';

/** Filters shared by both views: profile name, record type (one column), layout or page (rows that use it), issues only. */
function Filters({ value, onChange, recordTypes, targets, targetLabel, issuesLabel }: {
  value: FilterState; onChange: (v: FilterState) => void; recordTypes: RecordTypeInfo[];
  targets: { id: string; label: string }[]; targetLabel: string; issuesLabel: string;
}) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
  const active = value.profile || value.recordType || value.target || value.onlyIssues;
  return (
    <div className="toolbar">
      <input className="input" type="search" id="profile-search" placeholder="Filtra profili" value={value.profile} onChange={e => set({ profile: e.target.value })} />
      <select className="input" id="rt-filter" aria-label="Record type" value={value.recordType} onChange={e => set({ recordType: e.target.value })}>
        <option value="">Tutti i record type</option>
        {recordTypes.map(rt => <option key={rtKey(rt)} value={rtKey(rt)}>{rt.label}</option>)}
      </select>
      <select className="input" id="target-filter" aria-label={targetLabel} value={value.target} onChange={e => set({ target: e.target.value })}>
        <option value="">{targetLabel}: tutti</option>
        {targets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <label className="check"><input type="checkbox" id="only-issues" checked={value.onlyIssues} onChange={e => set({ onlyIssues: e.target.checked })} />{issuesLabel}</label>
      {active && <button className="btn sm" onClick={() => onChange(NO_FILTER)}>Azzera filtri</button>}
    </div>
  );
}

const dot = (i: number) => ({ background: `hsl(${(i * 67) % 360} 55% 55%)` });

function LayoutView({ data }: { data: LayoutAnalysis }) {
  const [filter, setFilter] = useState(NO_FILTER);
  const layoutIndex = useMemo(() => new Map(data.layouts.map((l, i) => [l.id, i])), [data]);
  const assignment = useMemo(() => new Map(data.assignments.map(a => [`${a.profileId}|${a.recordTypeId ?? ''}`, a.layoutId])), [data]);
  const gaps = useMemo(() => new Map(data.gaps.map(g => [`${g.profileId}|${g.layoutId}`, g.fields])), [data]);
  const noRead = useMemo(() => new Set(data.noObjectRead), [data]);
  const assignedCount = (layoutId: string) => new Set(data.assignments.filter(a => a.layoutId === layoutId).map(a => a.profileId)).size;
  const unassigned = data.layouts.filter(l => assignedCount(l.id) === 0);
  const withGaps = new Set(data.gaps.map(g => g.profileId));
  const rts = data.recordTypes.filter(rt => !filter.recordType || rtKey(rt) === filter.recordType);
  const layoutOf = (profileId: string, rt: RecordTypeInfo) => assignment.get(`${profileId}|${rt.id ?? ''}`);
  const profiles = data.profiles.filter(p =>
    (!filter.profile || p.name.toLowerCase().includes(filter.profile.toLowerCase()))
    && (!filter.onlyIssues || rts.some(rt => { const l = layoutOf(p.id, rt); return !!l && gaps.has(`${p.id}|${l}`); }))
    && (!filter.target || rts.some(rt => layoutOf(p.id, rt) === filter.target)));

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="k">Page layout</div><div className="n">{data.layouts.length}</div></div>
        <div className={`kpi ${unassigned.length ? 'warn' : ''}`}><div className="k">Non assegnati</div><div className="n">{unassigned.length}</div></div>
        <div className="kpi"><div className="k">Profili</div><div className="n">{data.profiles.length}</div></div>
        <div className={`kpi ${withGaps.size ? 'bad' : ''}`}><div className="k">Profili con campi non leggibili</div><div className="n">{withGaps.size}</div></div>
        <div className="kpi"><div className="k">Senza accesso all'oggetto</div><div className="n">{data.noObjectRead.length}</div></div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-h"><h2>Assegnazioni per profilo e record type</h2></div>
        <div className="panel-b">
          <Filters value={filter} onChange={setFilter} recordTypes={data.recordTypes} targetLabel="Layout" issuesLabel="Solo con campi non leggibili"
            targets={data.layouts.map(l => ({ id: l.id, label: l.name }))} />
          <div className="tbl-wrap">
            <table className="dt assign">
              <thead><tr><th>Profilo</th>{rts.map(rt => <th key={rt.id ?? 'master'}>{rt.label}{!rt.active && <span className="muted"> (inattivo)</span>}</th>)}</tr></thead>
              <tbody>
                {profiles.map(p => (
                  <tr key={p.id} className={noRead.has(p.id) ? 'dim' : ''}>
                    <td>{p.name}{noRead.has(p.id) && <div className="muted small">Nessun accesso all'oggetto</div>}</td>
                    {rts.map(rt => {
                      const layoutId = layoutOf(p.id, rt);
                      const layout = layoutId ? data.layouts[layoutIndex.get(layoutId)!] : undefined;
                      const missing = layoutId ? gaps.get(`${p.id}|${layoutId}`) : undefined;
                      return (
                        <td key={rt.id ?? 'master'} className={filter.target && layoutId !== filter.target ? 'off' : ''}>
                          {layout ? <span className="lay"><i style={dot(layoutIndex.get(layout.id)!)} />{layout.name}</span> : <span className="muted">—</span>}
                          {missing && <div className="warn-text small" title={missing.join('\n')}>⚠ {missing.length} {missing.length === 1 ? 'campo non leggibile' : 'campi non leggibili'}</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!profiles.length && <tr><td colSpan={rts.length + 1} className="muted">Nessun profilo.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="muted small">"Campi non leggibili": campi presenti nel layout su cui il profilo, da solo, non ha la FLS di lettura. Gli utenti li vedono solo se un permission set glieli concede.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h"><h2>Page layout dell'oggetto</h2></div>
        <div className="tbl-wrap">
          <table className="dt">
            <thead><tr><th>Layout</th><th>Campi</th><th>Profili assegnati</th><th>Stato</th></tr></thead>
            <tbody>
              {data.layouts.map((l, i) => (
                <tr key={l.id} className={filter.target === l.id ? 'sel' : ''}>
                  <td><button className="linklike" title="Mostra i profili che usano questo layout" onClick={() => setFilter({ ...filter, target: filter.target === l.id ? '' : l.id })}><span className="lay"><i style={dot(i)} />{l.name}</span></button>{l.namespace && <span className="muted"> · {l.namespace}</span>}</td>
                  <td title={l.fields.map(f => f.split('.').slice(1).join('.')).join('\n')}>{l.fields.length}</td>
                  <td>{assignedCount(l.id)}</td>
                  <td>{assignedCount(l.id) ? <span className="pill st-ok">In uso</span> : <span className="pill st-part">Non assegnato</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const SOURCE_LABEL: Record<PageSource, string> = { 'app-profile': 'App, record type e profilo', app: "Default dell'app", org: "Default dell'org", system: 'Pagina di sistema' };
const SOURCE_CLASS: Record<PageSource, string> = { 'app-profile': 'st-info', app: 'st-ok', org: '', system: 'st-part' };

function PageView({ data }: { data: PageAnalysis }) {
  const [app, setApp] = useState(data.apps.find(a => a.name === 'standard__LightningSales')?.name ?? data.apps[0]?.name ?? '');
  const [filter, setFilter] = useState(NO_FILTER);
  const label = useMemo(() => new Map(data.pages.map(p => [p.name, p.label])), [data]);
  const unassigned = new Set(unassignedPages(data, data.pages.map(p => p.name)));
  const appLabel = (name: string) => data.apps.find(a => a.name === name)?.label ?? name;
  const appDefault = data.appDefaults.find(a => a.app === app)?.page ?? null;
  const activeRts = data.recordTypes.filter(rt => rt.active);
  const rts = activeRts.filter(rt => !filter.recordType || rtKey(rt) === filter.recordType);
  const rows = data.profiles
    .filter(p => !filter.profile || p.name.toLowerCase().includes(filter.profile.toLowerCase()))
    .map(p => ({ p, cells: rts.map(rt => p.fullName ? effectivePage(data, app, p.fullName, rt.developerName) : { page: null, source: 'system' as PageSource }) }))
    .filter(r => (!filter.onlyIssues || r.cells.some(c => c.source === 'app-profile')) && (!filter.target || r.cells.some(c => c.page === filter.target)));
  const usage = (name: string) => [
    ...(data.orgDefault === name ? ["Default dell'org"] : []),
    ...data.appDefaults.filter(a => a.page === name).map(a => `Default di ${appLabel(a.app)}`),
    ...[...new Set(data.assignments.filter(a => a.page === name).map(a => a.app))].map(a => `${data.assignments.filter(x => x.page === name && x.app === a).length} profili/record type in ${appLabel(a)}`)
  ];

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="k">Lightning page</div><div className="n">{data.pages.length}</div></div>
        <div className={`kpi ${unassigned.size ? 'warn' : ''}`}><div className="k">Non assegnate</div><div className="n">{unassigned.size}</div></div>
        <div className="kpi"><div className="k">App Lightning</div><div className="n">{data.apps.length}</div></div>
        <div className="kpi"><div className="k">Assegnazioni app, record type e profilo</div><div className="n">{data.assignments.length}</div></div>
        <div className="kpi"><div className="k">Default dell'org</div><div className="n small-n">{data.orgDefault ? label.get(data.orgDefault) ?? data.orgDefault : 'Pagina di sistema'}</div></div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-h"><h2>Pagina vista da ogni profilo (desktop)</h2>
          <select className="input" id="app-select" value={app} onChange={e => setApp(e.target.value)} style={{ maxWidth: 280 }}>
            {data.apps.map(a => <option key={a.name} value={a.name}>{a.label}</option>)}
          </select>
        </div>
        <div className="panel-b">
          <p className="muted small">Default dell'app: <b>{appDefault ? label.get(appDefault) ?? appDefault : 'nessuno'}</b>. Default dell'org: <b>{data.orgDefault ? label.get(data.orgDefault) ?? data.orgDefault : 'pagina di sistema'}</b>.</p>
          <Filters value={filter} onChange={setFilter} recordTypes={activeRts} targetLabel="Lightning page" issuesLabel="Solo con assegnazione specifica"
            targets={data.pages.map(pg => ({ id: pg.name, label: pg.label }))} />
          <div className="tbl-wrap">
            <table className="dt assign">
              <thead><tr><th>Profilo</th>{rts.map(rt => <th key={rt.id ?? 'master'}>{rt.label}</th>)}</tr></thead>
              <tbody>
                {rows.map(({ p, cells }) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    {cells.map((c, i) => (
                      <td key={rts[i]!.id ?? 'master'} className={filter.target && c.page !== filter.target ? 'off' : ''}>
                        <div>{c.page ? label.get(c.page) ?? c.page : <span className="muted">Pagina di sistema</span>}</div>
                        <span className={`pill ${SOURCE_CLASS[c.source]}`}>{SOURCE_LABEL[c.source]}</span>
                      </td>
                    ))}
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={rts.length + 1} className="muted">Nessun profilo.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h"><h2>Lightning page dell'oggetto</h2></div>
        <div className="tbl-wrap">
          <table className="dt">
            <thead><tr><th>Pagina</th><th>Componenti</th><th>Campi Dynamic Forms</th><th>Dove è assegnata</th></tr></thead>
            <tbody>
              {data.pages.map(p => (
                <tr key={p.id} className={filter.target === p.name ? 'sel' : ''}>
                  <td><button className="linklike" title="Mostra i profili che vedono questa pagina" onClick={() => setFilter({ ...filter, target: filter.target === p.name ? '' : p.name })}>{p.label}</button><div className="mono muted small">{p.name}</div></td>
                  <td title={p.components.join('\n')}>{p.components.length}<div className="muted small">{p.components.slice(0, 3).map(c => c.split(':').pop()).join(', ')}{p.components.length > 3 ? '…' : ''}</div></td>
                  <td title={p.fields.map(f => f.split('.').slice(1).join('.')).join('\n')}>{p.fields.length || <span className="muted">—</span>}</td>
                  <td>{unassigned.has(p.name) ? <span className="pill st-part">Non assegnata</span> : usage(p.name).map(u => <div key={u}>{u}</div>)}</td>
                </tr>
              ))}
              {!data.pages.length && <tr><td colSpan={4} className="muted">Nessuna Lightning record page per questo oggetto.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
