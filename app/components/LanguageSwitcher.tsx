"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { localeFromPathname, stripLocale, type Locale } from '@/lib/locale';
import { t } from '@/i18n';

/**
 * EN ⇄ AR toggle.
 *
 * Maps the current path to its counterpart. Product and category pages are the
 * hard case, because their URL segment differs between languages — the page
 * passes its counterpart in via `href`, since only the page knows the other
 * slug. Everything else is the same path with or without the /ar prefix.
 */
export default function LanguageSwitcher({
  href,
  className = '',
}: {
  /** The exact counterpart URL, for pages whose slug differs by language. */
  href?: string;
  className?: string;
}) {
  const pathname = usePathname() || '/';
  const locale: Locale = localeFromPathname(pathname);
  const other: Locale = locale === 'ar' ? 'en' : 'ar';

  // Without an explicit counterpart, toggle the prefix. Correct for every page
  // whose path is language-independent (/shop, /about, /contact, /).
  const fallback = locale === 'ar' ? stripLocale(pathname) : `/ar${pathname === '/' ? '' : pathname}` || '/ar';
  const target = href || fallback;

  return (
    <Link
      href={target}
      hrefLang={other}
      aria-label={t(locale, 'nav.languageAria')}
      className={`text-[#b3b3b3] hover:text-white transition-colors duration-300 text-sm tracking-wide ${className}`}
    >
      {t(locale, 'nav.language')}
    </Link>
  );
}
