import { describe, expect, it } from 'vitest';
import { MESSAGES, pickLang } from '../src/i18n.tsx';

describe('pickLang', () => {
  it('prefers the saved choice, then the browser languages, then English', () => {
    expect(pickLang('fr', ['it-IT'])).toBe('fr');
    expect(pickLang(null, ['de-DE', 'es-MX', 'it'])).toBe('es');
    expect(pickLang('xx', ['IT'])).toBe('it');
    expect(pickLang(null, ['de-DE'])).toBe('en');
  });
});

describe('locales', () => {
  const shape = (v: unknown): unknown =>
    Array.isArray(v) ? v.length : typeof v === 'object' && v && !('$$typeof' in v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v;
  it('have the same keys as English', () => {
    for (const [lang, messages] of Object.entries(MESSAGES)) expect(shape(messages), lang).toEqual(shape(MESSAGES.en));
  });
});
