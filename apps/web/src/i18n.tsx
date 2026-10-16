import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { en, type Messages } from './locales/en.tsx';
import { it } from './locales/it.tsx';
import { fr } from './locales/fr.tsx';
import { es } from './locales/es.tsx';
import { Flag } from './Flag.tsx';

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

/** Language menu with flags; a custom list because native select options can't be styled on the dark bar. */
export function LangPicker() {
  const { lang, t, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = LANGS.find(l => l.code === lang)!;
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  return (
    <div className="lang-pick" ref={box}>
      <button type="button" id="lang" className="btn sm lang-btn" aria-label={t.language} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Flag lang={current.code} />{current.label}<span className="caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="lang-menu" role="listbox" aria-label={t.language}>
          {LANGS.map(l => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button type="button" lang={l.code} onClick={() => { setLang(l.code); setOpen(false); }}>
                <Flag lang={l.code} />{l.label}{l.code === lang && <span className="check-mark" aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
