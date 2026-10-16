import { useState, type DragEvent, type KeyboardEvent } from 'react';

/**
 * Drag to reorder a row of tabs. `move(id, beforeId)` puts `id` before `beforeId`, or last when it is null.
 * While dragging, the tab under the pointer shows on which side the dragged one will land. Ctrl+Shift+←/→ on a
 * focused tab does the same from the keyboard.
 */
export function useTabDrag(ids: string[], move: (id: string, beforeId: string | null) => void) {
  const [drag, setDrag] = useState<{ id: string; over: string | null; after: boolean } | null>(null);
  const beforeOf = (over: string, after: boolean) => after ? ids[ids.indexOf(over) + 1] ?? null : over;

  const props = (id: string) => ({
    draggable: true,
    'data-drop': drag && drag.over === id && drag.id !== id ? (drag.after ? 'after' : 'before') : undefined,
    'data-dragging': drag?.id === id || undefined,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      setDrag({ id, over: null, after: false });
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!drag || !ids.includes(drag.id)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const r = e.currentTarget.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      if (drag.over !== id || drag.after !== after) setDrag({ ...drag, over: id, after });
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (!drag || !ids.includes(drag.id)) return;
      e.preventDefault();
      if (drag.id !== id) move(drag.id, beforeOf(id, drag.after));
      setDrag(null);
    },
    onDragEnd: () => setDrag(null),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (!e.ctrlKey || !e.shiftKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      const at = ids.indexOf(id);
      if (e.key === 'ArrowLeft' && at > 0) move(id, ids[at - 1]!);
      if (e.key === 'ArrowRight' && at < ids.length - 1) move(id, ids[at + 2] ?? null);
    }
  });
  return props;
}
