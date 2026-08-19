import 'server-only';
import { headers } from 'next/headers';

import { localeFromPathname, PATHNAME_HEADER, type Locale } from './locale';

/**
 * The server-only half of the locale helpers.
 *
 * `next/headers` cannot appear anywhere in a client component's import graph,
 * and `Locale` is needed by client components — so the pure rules live in
 * `lib/locale.ts` and only this file reads the request.
 *
 * `server-only` makes a mistaken client import a build error with a clear
 * message, rather than the confusing "next/headers in pages/" one.
 */

/**
 * The locale of the page being rendered.
 *
 * Reads the header middleware set. If it is missing — a route the matcher does
 * not cover, or a unit test — English is the safe answer, because English is
 * what every pre-Phase-2 URL serves.
 */
export async function getLocale(): Promise<Locale> {
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? '/';
  return localeFromPathname(pathname);
}

/** The current path, as middleware saw it. */
export async function getPathname(): Promise<string> {
  return (await headers()).get(PATHNAME_HEADER) ?? '/';
}
