import Link from 'next/link';

import { t } from '@/i18n';
import type { Locale } from '@/lib/locale';
import { featuredView, getFeaturedProduct } from '@/product/featured';

import FeaturedPhotos from './FeaturedPhotos';

/**
 * The home page's featured product (3 Nov 2026) — replaces the hand-typed
 * "Explore" section. The head coach picks the product on the dashboard
 * (/shop → Settings); this draws the product itself, in the page's
 * language. Nothing to show (none chosen, hidden, sold out) = no section.
 */
export default async function Featured({ locale = 'en' }: { locale?: Locale }) {
  const view = featuredView(await getFeaturedProduct(), locale);
  if (!view) return null;

  const money = (n: number) => `${n.toLocaleString('en-US')} ${t(locale, 'product.currency')}`;

  return (
    <section
      className="relative w-full min-h-[80vh] flex items-center py-16 sm:py-20 lg:py-0 bg-stone-900"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      aria-labelledby="featured-title"
    >
      <div className="w-full max-w-[1800px] mx-auto px-8 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="order-2 lg:order-1 flex flex-col items-center justify-center gap-4 max-w-md mx-auto text-center">
            <h2 id="featured-title" className="text-4xl lg:text-6xl text-white font-normal leading-tight tracking-tight">
              {t(locale, 'home.featured.title')}
            </h2>
            <h3 className="text-xl lg:text-2xl font-light text-[#b3b3b3]">{view.name}</h3>
            <p className="text-xl lg:text-2xl font-light text-white">
              {money(view.price)}
              {view.originalPrice !== null && (
                <span className="ms-3 text-base text-white/40 line-through">{money(view.originalPrice)}</span>
              )}
            </p>
            <Link
              href={view.href}
              className="w-full py-3 text-sm font-medium tracking-wide transition-colors bg-white hover:bg-white/90 text-black flex items-center justify-center"
            >
              {t(locale, 'home.featured.buy')}
            </Link>
            {(view.options.length > 0 || view.description) && (
              <div className="space-y-2 text-xs text-white/50 max-w-sm">
                {view.options.length > 0 && (
                  <p className="font-medium text-white/70 uppercase">{view.options.join(' / ')}</p>
                )}
                {view.description && <p>{view.description}</p>}
              </div>
            )}
          </div>

          <div className="order-1 lg:order-2">
            <FeaturedPhotos images={view.images} alt={view.name} />
          </div>
        </div>
      </div>
    </section>
  );
}
