import { useEffect, useId, useMemo, useState } from 'react';
import { effectivePage, unassignedPages, type PageSource } from '@fls/core';
import { MultiPick } from '../MultiPick.tsx';
import { trackLoad, useTabId } from '../loads.ts';
import { useT } from '../i18n.tsx';
import { ExportMenu, type ExportItem } from '../export/ExportMenu.tsx';
import { CSV_TYPE, XLSX_TYPE, download, slug, stamp, toCsv, toXlsx, type Sheet } from '../export/table.ts';
import { api, type AssignmentInput, type LayoutAnalysis, type Org, type PageAnalysis, type ProfileInfo, type RecordTypeInfo, type SObject } from '../api.ts';

type Tab = 'layouts' | 'pages';

interface Props {
  org: Org; initialObject?: string | null; initialTab?: Tab; onChange?: (object: string | null, tab: Tab) => void;
  /** Opens a change set created from the edited assignments. */
  onChangeSet?: (id: string, number: string) => void;
  onDirty?: (dirty: boolean) => void;
}

export function LayoutsPage({ org, initialObject = null, initialTab = 'layouts', onChange, onChangeSet, onDirty }: Props) {
  const t = useT();
  const [objects, setObjects] = useState<SObject[]>([]);
  const [object, setObject] = useState<string | null>(initialObject);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>(initialTab);
  const radio = useId();
  useEffect(() => { onChange?.(object, tab); }, [object, tab]);
  const [layouts, setLayouts] = useState<LayoutAnalysis | null>(null);
  const [pages, setPages] = useState<PageAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const tabId = useTabId();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /** Saves edited assignments as a change set and opens it; the view then shows the org's values again. */
  const submit = async (changes: AssignmentInput[]) => {
    const cs = await api.createAssignments(org.id, { changes, description: t.layouts.description(changes.length, object ?? '') });
    setSent(cs.number);
    onChangeSet?.(cs.id, cs.number);
  };
  const reload = () => { setSent(null); setLayouts(null); setPages(null); setReloadKey(k => k + 1); };

  useEffect(() => { api.objects(org.id).then(setObjects).catch(e => setError(e.message)); }, [org.id]);

  useEffect(() => {
    if (!object) return;
    if (tab === 'layouts' ? layouts?.object === object : pages?.object === object) return;
    setLoading(true); setError(null);
    const load = tab === 'layouts' ? api.layouts(org.id, object).then(setLayouts) : api.lightningPages(org.id, object).then(setPages);
    trackLoad(tabId, 'load', load).catch(e => setError((e as Error).message)).finally(() => setLoading(false));
  }, [org.id, object, tab, reloadKey]);

  const matches = query.length < 2 ? [] : objects.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) || o.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const current = tab === 'layouts' ? layouts : pages;

  return (
    <>
      <div className="view-head">
        <div><div className="eyebrow">{org.label}</div><h1>{t.layouts.title}</h1>
          <p>{t.layouts.intro}</p></div>
      </div>

      <section className="panel panel-b object-picker">
        <div className="row">
          {object && <span className="chip on">{object}</span>}
          <div className="combo">
            <input className="input" id="layout-object" placeholder={object ? t.layouts.changeObject : t.layouts.chooseObject} value={query} onChange={e => setQuery(e.target.value)} />
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
            <label><input type="radio" name={radio} id="tab-layouts" checked={tab === 'layouts'} onChange={() => setTab('layouts')} />{t.layouts.pageLayout}</label>
            <label><input type="radio" name={radio} id="tab-pages" checked={tab === 'pages'} onChange={() => setTab('pages')} />{t.layouts.lightningPage}</label>
          </div>
        </div>
      </section>

      {error && <div className="banner prod">{error}</div>}
      {sent && <div className="banner info row">{t.layouts.sent(sent)}<span className="spacer" /><button className="btn sm" onClick={reload}>{t.layouts.reload}</button></div>}
      {loading && <p className="muted">{tab === 'layouts' ? t.layouts.loadingLayouts : t.layouts.loadingPages}</p>}
      {!object && <div className="panel empty">{t.layouts.empty}</div>}
      {object && !loading && current?.object === object && (tab === 'layouts'
        ? <LayoutView key={`${object}-${reloadKey}`} data={layouts!} orgLabel={org.label} onSubmit={submit} onDirty={onDirty} />
        : <PageView key={`${object}-${reloadKey}`} data={pages!} orgLabel={org.label} onSubmit={submit} onDirty={onDirty} />)}
    </>
  );
}

/** Ticked profile ids, record type keys and layout ids or page names; an empty list means no filter. */
interface FilterState { profile: string[]; recordType: string[]; target: string[]; onlyIssues: boolean }
const NO_FILTER: FilterState = { profile: [], recordType: [], target: [], onlyIssues: false };
const toggleIn = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];
const rtKey = (rt: RecordTypeInfo) => rt.id ?? 'master';

/** Filters shared by both views: profiles, record types (columns), layouts or pages (rows that use them), issues only. */
function Filters({ value, onChange, profiles, recordTypes, targets, targetLabel, issuesLabel }: {
  value: FilterState; onChange: (v: FilterState) => void; profiles: { id: string; name: string }[]; recordTypes: RecordTypeInfo[];
  targets: { id: string; label: string; sub?: string }[]; targetLabel: string; issuesLabel: string;
}) {
  const t = useT();
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
  const active = value.profile.length || value.recordType.length || value.target.length || value.onlyIssues;
  return (
    <div className="toolbar">
      <MultiPick id="profile-pick" label={t.layouts.profiles} selected={value.profile} onChange={profile => set({ profile })}
        options={profiles.map(p => ({ id: p.id, label: p.name }))} />
      <MultiPick id="rt-pick" label={t.layouts.recordType} selected={value.recordType} onChange={recordType => set({ recordType })}
        options={recordTypes.map(rt => ({ id: rtKey(rt), label: rt.label, sub: rt.developerName ?? undefined }))} />
      <MultiPick id="target-pick" label={targetLabel} selected={value.target} onChange={target => set({ target })} options={targets} />
      <label className="check"><input type="checkbox" id="only-issues" checked={value.onlyIssues} onChange={e => set({ onlyIssues: e.target.checked })} />{issuesLabel}</label>
      {active ? <button className="btn sm" onClick={() => onChange(NO_FILTER)}>{t.layouts.resetFilters}</button> : null}
    </div>
  );
}

/** Excel and CSV for a view: the CSV holds the first sheet. */
function exportItems(t: ReturnType<typeof useT>, base: string, sheets: () => Sheet[]): ExportItem[] {
  return [
    { id: 'xlsx', label: t.export.excel, run: async p => download(`${base}.xlsx`, await toXlsx(sheets(), p), XLSX_TYPE) },
    { id: 'csv', label: t.export.csv, run: async p => download(`${base}.csv`, await toCsv(sheets()[0]!.rows, t.locale, p), CSV_TYPE) }
  ];
}

interface EditProps { onSubmit: (changes: AssignmentInput[]) => Promise<void>; onDirty?: (dirty: boolean) => void }

/** Edited cells by key, with the create-change-set call; pending edits mark the tab as dirty. */
function useEdits(onSubmit: EditProps['onSubmit'], onDirty?: EditProps['onDirty']) {
  const [pending, setPending] = useState<Map<string, string>>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { onDirty?.(pending.size > 0); }, [pending.size > 0]);
  useEffect(() => () => onDirty?.(false), []);
  /** Sets `value` on `keys`; a value equal to the org's (`original`) clears the edit. */
  const set = (entries: [key: string, value: string, original: string][]) => setPending(prev => {
    const next = new Map(prev);
    for (const [k, v, o] of entries) { if (v === o) next.delete(k); else next.set(k, v); }
    return next;
  });
  const send = async (changes: AssignmentInput[]) => {
    setBusy(true); setError(null);
    try { await onSubmit(changes); setPending(new Map()); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return { pending, set, discard: () => setPending(new Map()), send, busy, error };
}

/** Pending count, discard and "go to preview", under the assignment table while editing. */
function EditBar({ count, busy, error, onDiscard, onSend, hint }: { count: number; busy: boolean; error: string | null; onDiscard: () => void; onSend: () => void; hint: string }) {
  const t = useT();
  return (
    <>
      {error && <div className="banner prod">{error}</div>}
      <div className="selbar edit-bar">
        <span className="muted small">{hint}</span>
        <span className="spacer" />
        <span className={count ? 'warn-text' : 'muted'}>{t.layouts.pending(count)}</span>
        <button className="btn sm danger" disabled={!count} onClick={onDiscard}>{t.layouts.discard}</button>
        <button className="btn sm primary" id="assign-preview" disabled={!count || busy} onClick={onSend}>{busy ? t.layouts.preparing : t.layouts.toPreview}</button>
      </div>
    </>
  );
}

/** Edit-mode toggle in a panel header. */
function EditToggle({ editing, onChange, pending }: { editing: boolean; onChange: (on: boolean) => void; pending: number }) {
  const t = useT();
  return (
    <button className={`btn sm${editing ? ' on' : ''}`} id="assign-edit" aria-pressed={editing} disabled={editing && pending > 0} title={editing && pending ? t.layouts.finishFirst : undefined}
      onClick={() => onChange(!editing)}>{editing ? t.layouts.editDone : t.layouts.edit}</button>
  );
}

const editable = (p: ProfileInfo) => !!p.fullName;

const dot = (i: number) => ({ background: `hsl(${(i * 67) % 360} 55% 55%)` });

function LayoutView({ data, orgLabel, onSubmit, onDirty }: { data: LayoutAnalysis; orgLabel: string } & EditProps) {
  const t = useT();
  const [filter, setFilter] = useState(NO_FILTER);
  const [editing, setEditing] = useState(false);
  const edits = useEdits(onSubmit, onDirty);
  const cellKey = (p: ProfileInfo, rt: RecordTypeInfo) => `${p.id}|${rtKey(rt)}`;
  const layoutIndex = useMemo(() => new Map(data.layouts.map((l, i) => [l.id, i])), [data]);
  const assignment = useMemo(() => new Map(data.assignments.map(a => [`${a.profileId}|${a.recordTypeId ?? ''}`, a.layoutId])), [data]);
  const gaps = useMemo(() => new Map(data.gaps.map(g => [`${g.profileId}|${g.layoutId}`, g.fields])), [data]);
  const noRead = useMemo(() => new Set(data.noObjectRead), [data]);
  const assignedCount = (layoutId: string) => new Set(data.assignments.filter(a => a.layoutId === layoutId).map(a => a.profileId)).size;
  const unassigned = data.layouts.filter(l => assignedCount(l.id) === 0);
  const withGaps = new Set(data.gaps.map(g => g.profileId));
  const rts = data.recordTypes.filter(rt => !filter.recordType.length || filter.recordType.includes(rtKey(rt)));
  const orgLayoutOf = (profileId: string, rt: RecordTypeInfo) => assignment.get(`${profileId}|${rt.id ?? ''}`);
  /** The layout a cell shows: the edited one, else the org's. */
  const layoutOf = (profileId: string, rt: RecordTypeInfo) => edits.pending.get(`${profileId}|${rtKey(rt)}`) ?? orgLayoutOf(profileId, rt);
  const setLayout = (ps: ProfileInfo[], rt: RecordTypeInfo, layoutId: string) =>
    edits.set(ps.filter(editable).map(p => [cellKey(p, rt), layoutId, orgLayoutOf(p.id, rt) ?? '']));
  const send = () => edits.send([...edits.pending].map(([k, layoutId]) => {
    const [profileId, rk] = k.split('|') as [string, string];
    const p = data.profiles.find(x => x.id === profileId)!;
    const rt = data.recordTypes.find(r => rtKey(r) === rk)!;
    const l = data.layouts[layoutIndex.get(layoutId)!]!;
    return { kind: 'layout', object: data.object, profile: p.fullName!, profileLabel: p.name, recordType: rt.developerName, app: null, after: l.namespace ? `${l.namespace}__${l.name}` : l.name };
  }));
  const profiles = data.profiles.filter(p =>
    (!filter.profile.length || filter.profile.includes(p.id))
    && (!filter.onlyIssues || rts.some(rt => { const l = layoutOf(p.id, rt); return !!l && gaps.has(`${p.id}|${l}`); }))
    && (!filter.target.length || rts.some(rt => filter.target.includes(layoutOf(p.id, rt) ?? ''))));

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="k">{t.layouts.kpiLayouts}</div><div className="n">{data.layouts.length}</div></div>
        <div className={`kpi ${unassigned.length ? 'warn' : ''}`}><div className="k">{t.layouts.kpiUnassigned}</div><div className="n">{unassigned.length}</div></div>
        <div className="kpi"><div className="k">{t.layouts.kpiProfiles}</div><div className="n">{data.profiles.length}</div></div>
        <div className={`kpi ${withGaps.size ? 'bad' : ''}`}><div className="k">{t.layouts.kpiGaps}</div><div className="n">{withGaps.size}</div></div>
        <div className="kpi"><div className="k">{t.layouts.kpiNoAccess}</div><div className="n">{data.noObjectRead.length}</div></div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-h"><h2>{t.layouts.assignments}</h2>
          <span className="spacer" />
          <EditToggle editing={editing} onChange={setEditing} pending={edits.pending.size} />
          <ExportMenu note={t.export.rowsScope(profiles.length)} items={exportItems(t, `orgsmith-layouts-${slug(orgLabel)}-${data.object}-${stamp()}`, () => [
            {
              name: t.export.sheetAssignments,
              rows: [[t.layouts.profile, ...rts.map(rt => rt.label)], ...profiles.map(p => [p.name, ...rts.map(rt => {
                const id = layoutOf(p.id, rt), l = id ? data.layouts[layoutIndex.get(id)!] : undefined, missing = id ? gaps.get(`${p.id}|${id}`) : undefined;
                return l ? `${l.name}${missing ? ` (⚠ ${t.layouts.unreadable(missing.length)})` : ''}` : null;
              })])]
            },
            {
              name: t.export.sheetLayouts,
              rows: [t.layouts.layoutCols, ...data.layouts.map(l => [l.name, l.fields.length, assignedCount(l.id), assignedCount(l.id) ? t.layouts.inUse : t.layouts.unassignedOne])]
            }
          ])} />
        </div>
        <div className="panel-b">
          <Filters value={filter} onChange={setFilter} profiles={data.profiles} recordTypes={data.recordTypes} targetLabel={t.layouts.layout} issuesLabel={t.layouts.onlyGaps}
            targets={data.layouts.map(l => ({ id: l.id, label: l.name }))} />
          <div className="tbl-wrap">
            <table className="dt assign">
              <thead><tr><th>{t.layouts.profile}</th>{rts.map(rt => (
                <th key={rt.id ?? 'master'}>{rt.label}{!rt.active && <span className="muted">{t.layouts.inactive}</span>}
                  {editing && (
                    <select className="input sm col-set" aria-label={t.layouts.setColumn} value="" onChange={e => setLayout(profiles, rt, e.target.value)}>
                      <option value="">{t.layouts.setColumn}</option>
                      {data.layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  )}
                </th>
              ))}</tr></thead>
              <tbody>
                {profiles.map(p => (
                  <tr key={p.id} className={noRead.has(p.id) ? 'dim' : ''}>
                    <td>{p.name}{noRead.has(p.id) && <div className="muted small">{t.layouts.noObjectAccess}</div>}</td>
                    {rts.map(rt => {
                      const layoutId = layoutOf(p.id, rt);
                      const layout = layoutId ? data.layouts[layoutIndex.get(layoutId)!] : undefined;
                      const missing = layoutId ? gaps.get(`${p.id}|${layoutId}`) : undefined;
                      return (
                        <td key={rt.id ?? 'master'} className={`${filter.target.length && !filter.target.includes(layoutId ?? '') ? 'off' : ''}${edits.pending.has(cellKey(p, rt)) ? ' pend' : ''}`}>
                          {editing && editable(p)
                            ? (
                              <select className="input sm cell-set" aria-label={`${p.name} · ${rt.label}`} value={layoutId ?? ''} onChange={e => setLayout([p], rt, e.target.value)}>
                                {!layoutId && <option value="">—</option>}
                                {data.layouts.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                              </select>
                            )
                            : layout ? <span className="lay"><i style={dot(layoutIndex.get(layout.id)!)} />{layout.name}</span> : <span className="muted">—</span>}
                          {editing && !editable(p) && <div className="muted small">{t.layouts.noFullName}</div>}
                          {missing && <div className="warn-text small" title={missing.join('\n')}>⚠ {t.layouts.unreadable(missing.length)}</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!profiles.length && <tr><td colSpan={rts.length + 1} className="muted">{t.layouts.noProfiles}</td></tr>}
              </tbody>
            </table>
          </div>
          {editing && <EditBar count={edits.pending.size} busy={edits.busy} error={edits.error} onDiscard={edits.discard} onSend={send} hint={t.layouts.layoutEditHint} />}
          <p className="muted small">{t.layouts.gapNote}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h"><h2>{t.layouts.objectLayouts}</h2></div>
        <div className="tbl-wrap">
          <table className="dt">
            <thead><tr>{t.layouts.layoutCols.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {data.layouts.map((l, i) => (
                <tr key={l.id} className={filter.target.includes(l.id) ? 'sel' : ''}>
                  <td><button className="linklike" title={t.layouts.showLayoutProfiles} onClick={() => setFilter({ ...filter, target: toggleIn(filter.target, l.id) })}><span className="lay"><i style={dot(i)} />{l.name}</span></button>{l.namespace && <span className="muted"> · {l.namespace}</span>}</td>
                  <td title={l.fields.map(f => f.split('.').slice(1).join('.')).join('\n')}>{l.fields.length}</td>
                  <td>{assignedCount(l.id)}</td>
                  <td>{assignedCount(l.id) ? <span className="pill st-ok">{t.layouts.inUse}</span> : <span className="pill st-part">{t.layouts.unassignedOne}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const SOURCE_CLASS: Record<PageSource, string> = { 'app-profile': 'st-info', app: 'st-ok', org: '', system: 'st-part' };

function PageView({ data, orgLabel, onSubmit, onDirty }: { data: PageAnalysis; orgLabel: string } & EditProps) {
  const t = useT();
  const [app, setApp] = useState(data.apps.find(a => a.name === 'standard__LightningSales')?.name ?? data.apps[0]?.name ?? '');
  const [filter, setFilter] = useState(NO_FILTER);
  const [editing, setEditing] = useState(false);
  const edits = useEdits(onSubmit, onDirty);
  // Edited cells hold the page name, or '' to remove the app + record type + profile assignment.
  const cellKey = (p: ProfileInfo, rt: RecordTypeInfo) => `${app}|${p.id}|${rtKey(rt)}`;
  const orgSpecific = (p: ProfileInfo, rt: RecordTypeInfo) =>
    data.assignments.find(a => a.app === app && a.profile === p.fullName && a.recordType === rt.developerName)?.page ?? '';
  const specific = (p: ProfileInfo, rt: RecordTypeInfo) => edits.pending.get(cellKey(p, rt)) ?? orgSpecific(p, rt);
  /** The page a profile sees with the edits applied. */
  const shownPage = (p: ProfileInfo, rt: RecordTypeInfo): { page: string | null; source: PageSource } => {
    if (!p.fullName) return { page: null, source: 'system' };
    if (!edits.pending.has(cellKey(p, rt))) return effectivePage(data, app, p.fullName, rt.developerName);
    const page = edits.pending.get(cellKey(p, rt))!;
    return page ? { page, source: 'app-profile' } : effectivePage({ ...data, assignments: [] }, app, p.fullName, rt.developerName);
  };
  const setPage = (ps: ProfileInfo[], rt: RecordTypeInfo, page: string) =>
    edits.set(ps.filter(editable).map(p => [cellKey(p, rt), page, orgSpecific(p, rt)]));
  const send = () => edits.send([...edits.pending].map(([k, page]) => {
    const [appName, profileId, rk] = k.split('|') as [string, string, string];
    const p = data.profiles.find(x => x.id === profileId)!;
    const rt = data.recordTypes.find(r => rtKey(r) === rk)!;
    return { kind: 'page', object: data.object, profile: p.fullName!, profileLabel: p.name, recordType: rt.developerName, app: appName, after: page || null };
  }));
  const label = useMemo(() => new Map(data.pages.map(p => [p.name, p.label])), [data]);
  const unassigned = new Set(unassignedPages(data, data.pages.map(p => p.name)));
  const appLabel = (name: string) => data.apps.find(a => a.name === name)?.label ?? name;
  const appDefault = data.appDefaults.find(a => a.app === app)?.page ?? null;
  const activeRts = data.recordTypes.filter(rt => rt.active);
  const rts = activeRts.filter(rt => !filter.recordType.length || filter.recordType.includes(rtKey(rt)));
  const rows = data.profiles
    .filter(p => !filter.profile.length || filter.profile.includes(p.id))
    .map(p => ({ p, cells: rts.map(rt => shownPage(p, rt)) }))
    .filter(r => (!filter.onlyIssues || r.cells.some(c => c.source === 'app-profile')) && (!filter.target.length || r.cells.some(c => filter.target.includes(c.page ?? ''))));
  const usage = (name: string) => [
    ...(data.orgDefault === name ? [t.layouts.orgDefault] : []),
    ...data.appDefaults.filter(a => a.page === name).map(a => t.layouts.appDefault(appLabel(a.app))),
    ...[...new Set(data.assignments.filter(a => a.page === name).map(a => a.app))].map(a => t.layouts.assignedIn(data.assignments.filter(x => x.page === name && x.app === a).length, appLabel(a)))
  ];

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="k">{t.layouts.kpiPages}</div><div className="n">{data.pages.length}</div></div>
        <div className={`kpi ${unassigned.size ? 'warn' : ''}`}><div className="k">{t.layouts.kpiPagesUnassigned}</div><div className="n">{unassigned.size}</div></div>
        <div className="kpi"><div className="k">{t.layouts.kpiApps}</div><div className="n">{data.apps.length}</div></div>
        <div className="kpi"><div className="k">{t.layouts.kpiAssignments}</div><div className="n">{data.assignments.length}</div></div>
        <div className="kpi"><div className="k">{t.layouts.kpiOrgDefault}</div><div className="n small-n">{data.orgDefault ? label.get(data.orgDefault) ?? data.orgDefault : t.layouts.systemPage}</div></div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-h"><h2>{t.layouts.perProfile}</h2>
          <span className="spacer" />
          <EditToggle editing={editing} onChange={setEditing} pending={edits.pending.size} />
          <ExportMenu note={t.export.rowsScope(rows.length)} items={exportItems(t, `orgsmith-pages-${slug(orgLabel)}-${data.object}-${slug(appLabel(app))}-${stamp()}`, () => [
            {
              name: t.export.sheetAssignments,
              rows: [[t.layouts.profile, ...rts.flatMap(rt => [rt.label, `${rt.label} · ${t.export.source}`])],
                ...rows.map(({ p, cells }) => [p.name, ...cells.flatMap(c => [c.page ? label.get(c.page) ?? c.page : t.layouts.systemPage, t.layouts.source[c.source]!])])]
            },
            {
              name: t.export.sheetPages,
              rows: [t.layouts.pageCols, ...data.pages.map(p => [p.label, p.components.length, p.fields.length, unassigned.has(p.name) ? t.layouts.pageUnassigned : usage(p.name).join('; ')])]
            }
          ])} />
          <select className="input" id="app-select" value={app} onChange={e => setApp(e.target.value)} style={{ maxWidth: 280 }}>
            {data.apps.map(a => <option key={a.name} value={a.name}>{a.label}</option>)}
          </select>
        </div>
        <div className="panel-b">
          <p className="muted small">{t.layouts.defaults(appDefault ? label.get(appDefault) ?? appDefault : t.common.none, data.orgDefault ? label.get(data.orgDefault) ?? data.orgDefault : t.layouts.systemPageLower)}</p>
          <Filters value={filter} onChange={setFilter} profiles={data.profiles} recordTypes={activeRts} targetLabel={t.layouts.lightningPage} issuesLabel={t.layouts.onlySpecific}
            targets={data.pages.map(pg => ({ id: pg.name, label: pg.label }))} />
          <div className="tbl-wrap">
            <table className="dt assign">
              <thead><tr><th>{t.layouts.profile}</th>{rts.map(rt => (
                <th key={rt.id ?? 'master'}>{rt.label}
                  {editing && (
                    <select className="input sm col-set" aria-label={t.layouts.setColumn} value="-" onChange={e => setPage(rows.map(r => r.p), rt, e.target.value)}>
                      <option value="-" disabled>{t.layouts.setColumn}</option>
                      <option value="">{t.layouts.noSpecific}</option>
                      {data.pages.map(pg => <option key={pg.name} value={pg.name}>{pg.label}</option>)}
                    </select>
                  )}
                </th>
              ))}</tr></thead>
              <tbody>
                {rows.map(({ p, cells }) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    {cells.map((c, i) => (
                      <td key={rts[i]!.id ?? 'master'} className={`${filter.target.length && !filter.target.includes(c.page ?? '') ? 'off' : ''}${edits.pending.has(cellKey(p, rts[i]!)) ? ' pend' : ''}`}>
                        {editing && editable(p)
                          ? (
                            <select className="input sm cell-set" aria-label={`${p.name} · ${rts[i]!.label}`} value={specific(p, rts[i]!)} onChange={e => setPage([p], rts[i]!, e.target.value)}>
                              <option value="">{t.layouts.noSpecific}</option>
                              {data.pages.map(pg => <option key={pg.name} value={pg.name}>{pg.label}</option>)}
                            </select>
                          )
                          : <div>{c.page ? label.get(c.page) ?? c.page : <span className="muted">{t.layouts.systemPage}</span>}</div>}
                        {editing && !editable(p) && <div className="muted small">{t.layouts.noFullName}</div>}
                        {editing && editable(p) && c.source !== 'app-profile' && <div className="muted small">{c.page ? label.get(c.page) ?? c.page : t.layouts.systemPage}</div>}
                        <span className={`pill ${SOURCE_CLASS[c.source]}`}>{t.layouts.source[c.source]}</span>
                      </td>
                    ))}
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={rts.length + 1} className="muted">{t.layouts.noProfiles}</td></tr>}
              </tbody>
            </table>
          </div>
          {editing && <EditBar count={edits.pending.size} busy={edits.busy} error={edits.error} onDiscard={edits.discard} onSend={send} hint={t.layouts.pageEditHint} />}
        </div>
      </section>

      <section className="panel">
        <div className="panel-h"><h2>{t.layouts.objectPages}</h2></div>
        <div className="tbl-wrap">
          <table className="dt">
            <thead><tr>{t.layouts.pageCols.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {data.pages.map(p => (
                <tr key={p.id} className={filter.target.includes(p.name) ? 'sel' : ''}>
                  <td><button className="linklike" title={t.layouts.showPageProfiles} onClick={() => setFilter({ ...filter, target: toggleIn(filter.target, p.name) })}>{p.label}</button><div className="mono muted small">{p.name}</div></td>
                  <td title={p.components.join('\n')}>{p.components.length}<div className="muted small">{p.components.slice(0, 3).map(c => c.split(':').pop()).join(', ')}{p.components.length > 3 ? '…' : ''}</div></td>
                  <td title={p.fields.map(f => f.split('.').slice(1).join('.')).join('\n')}>{p.fields.length || <span className="muted">—</span>}</td>
                  <td>{unassigned.has(p.name) ? <span className="pill st-part">{t.layouts.pageUnassigned}</span> : usage(p.name).map(u => <div key={u}>{u}</div>)}</td>
                </tr>
              ))}
              {!data.pages.length && <tr><td colSpan={4} className="muted">{t.layouts.noPages}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
