import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../i18n.tsx';
import type { Access, BulkAction } from '../../api.ts';
import { AccessLegend } from '../../AccessLegend.tsx';
import { bounds, forEachCell, rangeSize, type CellRange } from '../../cellRange.ts';
import { lockedPs, targetFor, type MatrixModel } from './model.ts';
import { CellMenu } from './CellMenu.tsx';

const ROW_W = 240;
const HEAD_H = 150;
const SIZES = [16, 22, 30] as const;
const OVERSCAN = 4;

/**
 * The matrix as a map of small coloured squares, so many more profiles fit on screen. Hover reads a cell,
 * dragging selects a block and opens the access menu, and the keyboard moves and sets cells.
 */
export function DenseView({ model }: { model: MatrixModel }) {
  const t = useT();
  const d = t.views.dense;
  const { allFields, allPs, F, fields, columns, cur, apex } = model;
  const long = apex ? t.apex.access.long : t.access.long;
  const [size, setSize] = useState<number>(SIZES[1]);
  const C = size;
  const scroller = useRef<HTMLDivElement>(null);
  const colInner = useRef<HTMLDivElement>(null);
  const rowInner = useRef<HTMLDivElement>(null);
  const [win, setWin] = useState({ top: 0, left: 0, w: 900, h: 500 });
  const [range, setRange] = useState<CellRange | null>(null);
  const [focus, setFocus] = useState({ r: 0, c: 0 });
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ r: number; c: number; x: number; y: number } | null>(null);
  const drag = useRef({ active: false, x: 0, y: 0 });

  useEffect(() => { setRange(null); setMenu(null); setFocus({ r: 0, c: 0 }); }, [fields, columns]);

  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    if (colInner.current) colInner.current.style.transform = `translateX(${-el.scrollLeft}px)`;
    if (rowInner.current) rowInner.current.style.transform = `translateY(${-el.scrollTop}px)`;
    const next = { top: el.scrollTop, left: el.scrollLeft, w: el.clientWidth, h: el.clientHeight };
    setWin(v => v.top === next.top && v.left === next.left && v.w === next.w && v.h === next.h ? v : next);
  };
  const frame = useRef(0);
  useLayoutEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [C]);

  const r0 = Math.max(0, Math.floor(win.top / C) - OVERSCAN), r1 = Math.min(fields.length, Math.ceil((win.top + win.h) / C) + OVERSCAN);
  const c0 = Math.max(0, Math.floor(win.left / C) - OVERSCAN), c1 = Math.min(columns.length, Math.ceil((win.left + win.w) / C) + OVERSCAN);

  // The cells in view; memoised so hovering doesn't rebuild them.
  const cells = useMemo(() => {
    const out = [];
    for (let r = r0; r < r1; r++) {
      const i = fields[r]!, f = allFields[i]!;
      for (let c = c0; c < c1; c++) {
        const j = columns[c]!, idx = j * F + i;
        const cls = !f.permissionable ? 'na' : `v${cur(idx)}${lockedPs(allPs[j]!) ? ' lk' : ''}${model.pending.has(idx) ? ' pend' : ''}`;
        out.push(<span key={idx} className={`dc ${cls}`} style={{ left: c * C, top: r * C, width: C, height: C }}><i /></span>);
      }
    }
    return out;
  }, [r0, r1, c0, c1, C, fields, columns, model.rev]);

  const cellFromPoint = (x: number, y: number, clamp = false) => {
    const el = scroller.current;
    if (!el) return null;
    const box = el.getBoundingClientRect();
    let c = Math.floor((x - box.left + el.scrollLeft) / C), r = Math.floor((y - box.top + el.scrollTop) / C);
    if (clamp) { c = Math.max(0, Math.min(columns.length - 1, c)); r = Math.max(0, Math.min(fields.length - 1, r)); }
    return r >= 0 && r < fields.length && c >= 0 && c < columns.length ? { r, c } : null;
  };

  const stats = useMemo(() => {
    if (!range) return { cells: 0, editable: 0, pending: 0 };
    let editable = 0, pend = 0;
    forEachCell(range, fields, columns, (i, j) => { if (model.editable(i, j)) { editable++; if (model.pending.has(j * F + i)) pend++; } });
    return { cells: rangeSize(range), editable, pending: pend };
  }, [range, model.rev]);

  const apply = (action: BulkAction | 'revert' | 'cycle', keep = false) => {
    if (!range) return;
    forEachCell(range, fields, columns, (i, j) => {
      if (!model.editable(i, j)) return;
      const idx = j * F + i, v = cur(idx);
      if (action === 'revert') model.restore(idx, undefined);
      else if (action === 'cycle') { const max = apex || allFields[i]!.calculated ? 2 : 3; model.assign(i, j, ((v + 1) % max) as Access); }
      else model.assign(i, j, targetFor(action, v));
    });
    model.commit(); setMenu(null);
    if (!keep) setRange(null);
  };

  // Drag: follow the pointer, scroll near the edges, open the menu on release.
  const live = useRef({ cellFromPoint, setRange, setMenu, setFocus });
  live.current = { cellFromPoint, setRange, setMenu, setFocus };
  useEffect(() => {
    let raf = 0;
    const follow = () => {
      const hit = live.current.cellFromPoint(drag.current.x, drag.current.y, true);
      if (!hit) return;
      live.current.setRange(prev => prev && (prev.r1 !== hit.r || prev.c1 !== hit.c) ? { ...prev, r1: hit.r, c1: hit.c } : prev);
      live.current.setFocus(hit);
    };
    const tick = () => {
      raf = 0;
      const el = scroller.current;
      if (!drag.current.active || !el) return;
      const box = el.getBoundingClientRect(), edge = 30, step = 14;
      const dx = drag.current.x > box.right - edge ? step : drag.current.x < box.left + edge ? -step : 0;
      const dy = drag.current.y > box.bottom - edge ? step : drag.current.y < box.top + edge ? -step : 0;
      if (dx || dy) { el.scrollBy(dx, dy); follow(); }
      raf = requestAnimationFrame(tick);
    };
    const move = (e: MouseEvent) => {
      if (!drag.current.active) return;
      drag.current.x = e.clientX; drag.current.y = e.clientY;
      follow();
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const up = (e: MouseEvent) => {
      if (!drag.current.active) return;
      drag.current.active = false;
      cancelAnimationFrame(raf); raf = 0;
      live.current.setMenu({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const down = (e: MouseEvent) => { if (!(e.target as Element).closest?.('.cell-menu')) setMenu(null); };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [menu]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const hit = cellFromPoint(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    scroller.current?.focus({ preventScroll: true });
    setMenu(null); setHover(null);
    setRange(e.shiftKey && range ? { ...range, r1: hit.r, c1: hit.c } : { r0: hit.r, c0: hit.c, r1: hit.r, c1: hit.c });
    setFocus(hit);
    drag.current = { active: true, x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (drag.current.active) return;
    const hit = cellFromPoint(e.clientX, e.clientY);
    setHover(hit ? { ...hit, x: e.clientX, y: e.clientY } : null);
  };
  const selectRow = (r: number) => { setRange({ r0: r, c0: 0, r1: r, c1: columns.length - 1 }); setFocus({ r, c: 0 }); };
  const selectCol = (c: number) => { setRange({ r0: 0, c0: c, r1: fields.length - 1, c1: c }); setFocus({ r: 0, c }); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!fields.length || !columns.length) return;
    const key = e.key.toLowerCase();
    const mv = ({ arrowup: [-1, 0], arrowdown: [1, 0], arrowleft: [0, -1], arrowright: [0, 1] } as Record<string, [number, number]>)[key];
    if (mv) {
      e.preventDefault();
      const r = Math.max(0, Math.min(fields.length - 1, focus.r + mv[0])), c = Math.max(0, Math.min(columns.length - 1, focus.c + mv[1]));
      setFocus({ r, c }); setMenu(null);
      setRange(e.shiftKey && range ? { ...range, r1: r, c1: c } : { r0: r, c0: c, r1: r, c1: c });
      const el = scroller.current;
      if (el) {
        if (r * C < el.scrollTop) el.scrollTop = r * C; else if ((r + 1) * C > el.scrollTop + el.clientHeight) el.scrollTop = (r + 1) * C - el.clientHeight;
        if (c * C < el.scrollLeft) el.scrollLeft = c * C; else if ((c + 1) * C > el.scrollLeft + el.clientWidth) el.scrollLeft = (c + 1) * C - el.clientWidth;
      }
      return;
    }
    if (key === 'escape') { setRange(null); setMenu(null); return; }
    const act: BulkAction | 'cycle' | null = key === d.keys.none ? 'none' : key === d.keys.read ? 'read' : !apex && key === d.keys.edit ? 'edit' : key === ' ' ? 'cycle' : null;
    if (!act) return;
    e.preventDefault();
    if (!range) setRange({ r0: focus.r, c0: focus.c, r1: focus.r, c1: focus.c });
    // The range state may not be set yet: apply on the focused cell directly in that case.
    if (range) apply(act, true);
    else {
      const i = fields[focus.r]!, j = columns[focus.c]!;
      if (model.editable(i, j)) {
        const v = cur(j * F + i);
        model.assign(i, j, act === 'cycle' ? (((v + 1) % (apex || allFields[i]!.calculated ? 2 : 3)) as Access) : targetFor(act, v));
        model.commit();
      }
    }
  };

  const rb = range && bounds(range);
  const hi = hover && fields[hover.r] !== undefined && columns[hover.c] !== undefined ? { i: fields[hover.r]!, j: columns[hover.c]! } : null;
  const tip = hover && hi && (() => {
    const f = allFields[hi.i]!, p = allPs[hi.j]!, idx = hi.j * F + hi.i;
    return (
      <div className="dense-tip" style={{ left: Math.min(hover.x + 14, window.innerWidth - 300), top: hover.y + 16 }} role="tooltip">
        <b>{p.label}</b> · {f.label}
        <div>{!f.permissionable ? t.matrix.alwaysTitle : long[cur(idx)]}{model.pending.has(idx) && <span className="tip-was"> {t.matrix.was(long[model.base[idx]!]!)}</span>}</div>
        {lockedPs(p) && <div>🔒 {t.access.locked}</div>}
      </div>
    );
  })();
  const keys = [d.keys.none, d.keys.read, ...(apex ? [] : [d.keys.edit])].map(k => k.toUpperCase());

  return (
    <>
      <div className="dense-tools">
        <span className="muted small">{d.size}</span>
        <div className="seg seg-btn" role="group" aria-label={d.size}>
          {SIZES.map((s, n) => <button key={s} type="button" aria-pressed={C === s} onClick={() => setSize(s)}>{['S', 'M', 'L'][n]}</button>)}
        </div>
        <span className="muted small dense-keys">{d.help(keys)}</span>
      </div>
      <div className="dense" style={{ '--c': `${C}px` } as React.CSSProperties}>
        <div className="dense-corner" style={{ width: ROW_W, height: HEAD_H }}><span className="muted small">{apex ? t.apex.matrix.size(fields.length, columns.length) : t.matrix.size(fields.length, columns.length)}</span></div>
        <div className="dense-cols" style={{ left: ROW_W, height: HEAD_H }}>
          <div ref={colInner} className="dense-inner" style={{ width: columns.length * C }}>
            {columns.slice(c0, c1).map((j, n) => {
              const c = c0 + n, p = allPs[j]!;
              const on = (hover?.c === c) || (rb && c >= rb.left && c <= rb.right);
              return (
                <button key={p.id} type="button" className={`dense-col${on ? ' hl' : ''}${lockedPs(p) ? ' lk' : ''}${c > 0 && allPs[columns[c - 1]!]!.isProfile !== p.isProfile ? ' grp' : ''}`}
                  style={{ left: c * C, width: C }} title={`${p.label} (${p.isProfile ? t.export.profile : p.name})`} onClick={() => selectCol(c)}>
                  <span>{lockedPs(p) ? '🔒 ' : ''}{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="dense-rows" style={{ top: HEAD_H, width: ROW_W }}>
          <div ref={rowInner} className="dense-inner" style={{ height: fields.length * C }}>
            {fields.slice(r0, r1).map((i, n) => {
              const r = r0 + n, f = allFields[i]!;
              const on = (hover?.r === r) || (rb && r >= rb.top && r <= rb.bottom);
              return (
                <button key={f.name} type="button" className={`dense-row${on ? ' hl' : ''}`} style={{ top: r * C, height: C }} title={f.name} onClick={() => selectRow(r)}>
                  <span className="nm">{f.label}</span>{!apex && <span className="api">{f.name}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div ref={scroller} className="dense-scroll" style={{ top: HEAD_H, left: ROW_W }} tabIndex={0} role="grid" aria-label={apex ? t.apex.matrix.title : t.matrix.title}
          onScroll={() => { cancelAnimationFrame(frame.current); if (colInner.current && scroller.current) { colInner.current.style.transform = `translateX(${-scroller.current.scrollLeft}px)`; rowInner.current!.style.transform = `translateY(${-scroller.current.scrollTop}px)`; } frame.current = requestAnimationFrame(measure); }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseLeave={() => setHover(null)} onKeyDown={onKeyDown}>
          <div className="dense-body" style={{ width: columns.length * C, height: fields.length * C }}>
            {hover && <><span className="dense-band" style={{ top: hover.r * C, left: 0, width: columns.length * C, height: C }} /><span className="dense-band" style={{ left: hover.c * C, top: 0, height: fields.length * C, width: C }} /></>}
            {cells}
            {rb && <span className="dense-sel" style={{ left: rb.left * C, top: rb.top * C, width: (rb.right - rb.left + 1) * C, height: (rb.bottom - rb.top + 1) * C }} />}
            <span className="dense-focus" style={{ left: focus.c * C, top: focus.r * C, width: C, height: C }} />
          </div>
        </div>
      </div>
      {tip}
      {menu && range && <CellMenu apex={apex} x={menu.x} y={menu.y} stats={stats} onPick={a => apply(a)} onClose={() => { setMenu(null); setRange(null); }} />}
      <div className="legend"><AccessLegend apex={apex} /></div>
    </>
  );
}
