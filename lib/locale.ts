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
 * The `alternates` block for a page, given its English and Arabic paths.
 *
 * Google needs the pair to be symmetric — each URL must point at the other and
 * at itself — so both pages call this with the same two paths and differ only
 * in which one they pass as `current`.
 */
export function alternatesFor(enPath: string, arPath: string, current: Locale) {
  const enUrl = absoluteUrl(enPath);
  const arUrl = absoluteUrl(arPath);

  return {
    canonical: current === 'ar' ? arUrl : enUrl,
    languages: {
      'en-EG': enUrl,
      'ar-EG': arUrl,
      // Which version someone gets when no language matches. English, because
      // it is the version that has been indexed since the store launched.
      'x-default': enUrl,
    },
  };
}
