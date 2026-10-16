import type { Lang } from './i18n.tsx';

/** Flags drawn as SVG: Windows has no flag emoji and shows letters instead. */
export function Flag({ lang }: { lang: Lang }) {
  return (
    <svg className="flag" viewBox="0 0 30 20" width="20" height="14" aria-hidden="true">
      {lang === 'en' && (
        <>
          <clipPath id="flag-uk"><rect width="30" height="20" /></clipPath>
          <g clipPath="url(#flag-uk)">
            <rect width="30" height="20" fill="#012169" />
            <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
            <path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.6" />
            <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" />
            <path d="M15 0V20M0 10H30" stroke="#C8102E" strokeWidth="3.4" />
          </g>
        </>
      )}
      {lang === 'it' && <><rect width="10" height="20" fill="#009246" /><rect x="10" width="10" height="20" fill="#fff" /><rect x="20" width="10" height="20" fill="#CE2B37" /></>}
      {lang === 'fr' && <><rect width="10" height="20" fill="#002654" /><rect x="10" width="10" height="20" fill="#fff" /><rect x="20" width="10" height="20" fill="#CE1126" /></>}
      {lang === 'es' && <><rect width="30" height="20" fill="#AA151B" /><rect y="5" width="30" height="10" fill="#F1BF00" /></>}
    </svg>
  );
}
