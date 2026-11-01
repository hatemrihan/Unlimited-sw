/**
 * Locale rules — pure, and safe to import from a client component.
 *
 * Nothing here reads the request. Each language has its own root layout that
 * knows its locale at build time (app/components/StoreShell.tsx explains why).
 */

export type Locale = 'en' | 'ar';

export const LOCALES: Locale[] = ['en', 'ar'];
export const DEFAULT_LOCALE: Locale = 'en';

export const SITE_URL = 'https://unlimited-sw.com';

/**
 * Which language a path renders in.
 *
 * English keeps the bare URLs it already has (`/shop`, `/product/x`) because
 * those are indexed and linked; Arabic lives under `/ar`. Moving English to
 * `/en` would have meant redirecting every existing URL for no gain.
 */
export function localeFromPathname(pathname: string): Locale {
  return pathname === '/ar' || pathname.startsWith('/ar/') ? 'ar' : 'en';
}

/** Arabic is written right-to-left; English is not. */
export function directionFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Prefixes a path for a locale: ('/shop', 'ar') → '/ar/shop'.
 *
 * Takes the English path as the canonical form, so callers only ever build one
 * set of paths and translate at the edges.
 */
export function localizePath(path: string, locale: Locale): string {
  if (locale !== 'ar') return path || '/';
  return path === '/' ? '/ar' : `/ar${path}`;
}

/** Strips the /ar prefix, giving the English equivalent of a path. */
export function stripLocale(pathname: string): string {
  if (pathname === '/ar') return '/';
  return pathname.startsWith('/ar/') ? pathname.slice(3) : pathname;
}

/** An absolute URL, which is what canonical and hreflang tags require. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path === '/' ? '' : path}`;
}

/**
 * Who a page is for (1 Nov 2026). The SHOP ships inside Egypt only, so its
 * pages say Egypt (`ar-EG`, `en-EG`) — see lib/countries.ts for why the Gulf
 * stays gated. COACHING is online and sold across MENA, so coach pages say
 * only the language (`ar`, `en`): Google then offers them to an Arabic or
 * English searcher in any country, Riyadh as much as Cairo.
 */
export type Reach = 'egypt' | 'everywhere';

export function hreflangPair(enUrl: string, arUrl: string, reach: Reach = 'egypt') {
  return reach === 'everywhere' ? { en: enUrl, ar: arUrl } : { 'en-EG': enUrl, 'ar-EG': arUrl };
}

/**
 * The `alternates` block for a page, given its English and Arabic paths.
 *
 * Google needs the pair to be symmetric — each URL must point at the other and
 * at itself — so both pages call this with the same two paths and differ only
 * in which one they pass as `current`.
 */
export function alternatesFor(enPath: string, arPath: string, current: Locale, reach: Reach = 'egypt') {
  const enUrl = absoluteUrl(enPath);
  const arUrl = absoluteUrl(arPath);

  return {
    canonical: current === 'ar' ? arUrl : enUrl,
    languages: {
      ...hreflangPair(enUrl, arUrl, reach),
      // Which version someone gets when no language matches. English, because
      // it is the version that has been indexed since the store launched.
      'x-default': enUrl,
    },
  };
}
