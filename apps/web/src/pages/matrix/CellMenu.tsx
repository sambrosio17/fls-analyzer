import { useT } from '../../i18n.tsx';
import { menuPosition } from '../../cellRange.ts';
import type { BulkAction } from '../../api.ts';

const MENU_W = 240, MENU_H = 290;

/** Access choices for the cells picked by dragging. */
export function CellMenu({ apex, x, y, stats, onPick, onClose }: {
  apex: boolean; x: number; y: number; stats: { cells: number; editable: number; pending: number };
  onPick: (action: BulkAction | 'revert') => void; onClose: () => void;
}) {
  const t = useT();
  const [none0, read, edit] = t.access.short;
  const pos = menuPosition(x, y, MENU_W, MENU_H, window.innerWidth, window.innerHeight);
  const none = stats.editable === 0;
  return (
    <div className="cell-menu" role="menu" style={pos} onContextMenu={e => e.preventDefault()}>
      <div className="cell-menu-h">{t.cellMenu.cells(stats.cells)}{stats.editable !== stats.cells && t.cellMenu.editable(stats.editable)}</div>
      {apex ? <>
        <button role="menuitem" disabled={none} onClick={() => onPick('read')}><span className="box b1">{t.apex.access.short[1]}</span>{t.apex.bulk.enable}</button>
        <button role="menuitem" disabled={none} onClick={() => onPick('none')}><span className="box">{t.apex.access.short[0]}</span>{t.apex.bulk.disable}</button>
      </> : <>
        <button role="menuitem" disabled={none} onClick={() => onPick('none')}><span className="box">{none0}</span>{t.access.long[0]}</button>
        <button role="menuitem" disabled={none} onClick={() => onPick('read')}><span className="box b1">{read}</span>{t.access.long[1]}</button>
        <button role="menuitem" disabled={none} onClick={() => onPick('edit')}><span className="box b2">{edit}</span>{t.access.long[2]}</button>
        <button role="menuitem" disabled={none} onClick={() => onPick('removeEdit')}><span className="box b1">{read}</span>{t.cellMenu.removeEditOnly}</button>
      </>}
      <hr />
      <button role="menuitem" disabled={!stats.pending} onClick={() => onPick('revert')}><span className="box bp" />{t.cellMenu.revert}{stats.pending ? ` (${stats.pending})` : ''}</button>
      <button role="menuitem" onClick={onClose}><span className="box" />{t.cellMenu.clear}</button>
    </div>
  );
}
