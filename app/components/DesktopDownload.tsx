import Link from 'next/link';

import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { t } from '@/i18n';
import { directionFor, type Locale } from '@/lib/locale';

/**
 * /download — where the macOS and Windows installers will live (courses,
 * Phase 5). Until they are published this page says so plainly rather
 * than offering a button that downloads nothing. The installers are
 * listed in DESKTOP_BUILDS below the day they exist; nothing else changes.
 */
export const DESKTOP_BUILDS: { platform: 'macos' | 'windows'; label: string; href: string }[] = [];

export default function DesktopDownload({ locale }: { locale: Locale }) {
  const isArabic = locale === 'ar';
  return (
    <>
      <Nav />
      <main
        dir={directionFor(locale)}
        className="min-h-screen bg-stone-900 text-[#b3b3b3] pt-32 pb-24"
      >
        <div className="max-w-[640px] mx-auto px-6">
          <h1 className="text-2xl md:text-3xl font-medium text-white">
            {t(locale, 'download.title')}
          </h1>
          <p className="mt-4 text-sm md:text-base text-white/70 max-w-[60ch]">
            {t(locale, 'download.body')}
          </p>

          {DESKTOP_BUILDS.length > 0 && (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {DESKTOP_BUILDS.map((build) => (
                <li key={build.platform}>
                  <a
                    href={build.href}
                    className="block border border-white/20 p-5 text-sm text-white hover:bg-white hover:text-stone-900 transition-colors"
                  >
                    {build.label}
                  </a>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-10">
            <Link
              href={isArabic ? '/ar/coaches/welcome' : '/coaches/welcome'}
              className="inline-block border border-white/30 px-6 py-3 text-sm text-white hover:bg-white hover:text-stone-900 transition-colors"
            >
              {t(locale, 'download.phone')}
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
