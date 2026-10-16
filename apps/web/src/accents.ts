import { ACCENTS, type Accent } from '@fls/core';

export { ACCENTS, type Accent };

/**
 * Accent per org, in the Graphite Workshop palette: a darker tone for light surfaces and a brighter one for dark
 * surfaces and the top bar. Violet and red stay out: they already mean pending changes and production.
 */
export const ACCENT_COLORS: Record<Accent, { light: string; dark: string }> = {
  ember: { light: '#B5560F', dark: '#F08A3C' },
  amber: { light: '#966400', dark: '#E3B341' },
  olive: { light: '#5B7612', dark: '#A6C34E' },
  emerald: { light: '#0B7A63', dark: '#3CC5A4' },
  cyan: { light: '#0A7186', dark: '#4CC0D9' },
  blue: { light: '#1F5FBF', dark: '#6FA3F2' },
  indigo: { light: '#4550C4', dark: '#8F97F5' },
  magenta: { light: '#AE3479', dark: '#EE7DB8' },
  sand: { light: '#865838', dark: '#CC9C78' },
  slate: { light: '#4A5562', dark: '#A9B3BF' }
};

export const accentOf = (value: string | null | undefined): Accent => (ACCENTS as readonly string[]).includes(value ?? '') ? value as Accent : 'ember';

/** One rule per accent for <html data-accent>; soft and line tones are mixed from the accent itself. */
export function accentCss(): string {
  const rule = (c: string, ink: string, base: string, soft: number) =>
    `--accent:${c};--accent-ink:${ink};--accent-soft:color-mix(in srgb,${c} ${soft}%,${base});--accent-line:color-mix(in srgb,${c} 45%,${base});`;
  const light = ACCENTS.map(a => `:root[data-accent="${a}"]{${rule(ACCENT_COLORS[a].light, '#FFFFFF', '#FFFFFF', 15)}--mark:${ACCENT_COLORS[a].dark};}`);
  const dark = ACCENTS.map(a => `:root[data-accent="${a}"]{${rule(ACCENT_COLORS[a].dark, '#14110C', '#1F2328', 22)}}`);
  return `${light.join('')}@media (prefers-color-scheme: dark){${dark.join('')}}`;
}
