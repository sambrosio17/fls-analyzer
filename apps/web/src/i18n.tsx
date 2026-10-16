import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { en, type Messages } from './locales/en.tsx';
import { it } from './locales/it.tsx';
import { fr } from './locales/fr.tsx';
import { es } from './locales/es.tsx';

export type Lang = 'en' | 'it' | 'fr' | 'es';
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' }, { code: 'it', label: 'Italiano' }, { code: 'fr', label: 'Français' }, { code: 'es', label: 'Español' }
];
export const MESSAGES: Record<Lang, Messages> = { en, it, fr, es };

const STORAGE_KEY = 'orgsmith.lang';
const isLang = (v: string | null | undefined): v is Lang => !!v && v in MESSAGES;

/** The saved choice, else the first browser language we support, else English. */
export function pickLang(saved: string | null, browser: readonly string[]): Lang {
  if (isLang(saved)) return saved;
  for (const b of browser) { const code = b.slice(0, 2).toLowerCase(); if (isLang(code)) return code; }
  return 'en';
}

const storage = (() => { try { return window.localStorage; } catch { return null; } })();
const Ctx = createContext<{ lang: Lang; t: Messages; setLang: (l: Lang) => void }>({ lang: 'en', t: en, setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    let saved: string | null = null;
    try { saved = storage?.getItem(STORAGE_KEY) ?? null; } catch { /* storage blocked */ }
    return pickLang(saved, navigator.languages ?? [navigator.language]);
  });
  useEffect(() => {
    document.documentElement.lang = lang;
    try { storage?.setItem(STORAGE_KEY, lang); } catch { /* best effort */ }
  }, [lang]);
  return <Ctx.Provider value={{ lang, t: MESSAGES[lang], setLang }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx).t;
export const useLang = () => useContext(Ctx);

export function LangPicker() {
  const { lang, t, setLang } = useLang();
  return (
    <select className="input lang-pick" id="lang" aria-label={t.language} value={lang} onChange={e => setLang(e.target.value as Lang)}>
      {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  );
}
