import type { CSSProperties } from 'react';
import { ACCENTS, ACCENT_COLORS, accentOf, type Accent } from './accents.ts';
import { useT } from './i18n.tsx';

/** The ten accent colours as a row of swatches; the current one is pressed. */
export function AccentPicker({ value, onChange, id }: { value: string | null; onChange: (accent: Accent) => void; id?: string }) {
  const t = useT();
  const current = accentOf(value);
  return (
    <div className="swatches" role="radiogroup" aria-label={t.accent.label} id={id}>
      {ACCENTS.map(a => (
        <button key={a} type="button" role="radio" aria-checked={a === current} className="swatch" title={t.accent.names[a]} aria-label={t.accent.names[a]}
          style={{ '--sw-l': ACCENT_COLORS[a].light, '--sw-d': ACCENT_COLORS[a].dark } as CSSProperties}
          onClick={() => onChange(a)} />
      ))}
    </div>
  );
}
