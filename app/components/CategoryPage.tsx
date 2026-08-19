import Link from 'next/link';
import Image from 'next/image';

import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { CATEGORIES, CATEGORY_KEYS, categorySlug, type CategoryKey } from '@/product/categories';
import { categoryCopy } from '@/i18n/categories';
import { t } from '@/i18n';
import type { Locale } from '@/lib/locale';
import { breadcrumbJsonLd, faqJsonLd, localized, productPath } from '@/product/seo';
import type { Product } from '@/product/model';

/**
 * One category page, in either language.
 *
 * Both locales render this so the two versions cannot drift apart — a category
 * that gained a paragraph in English and not in Arabic is exactly the kind of
 * mismatch that makes an hreflang pair look like duplicate content.
 */
export default function CategoryPage({
  category,
  products,
  locale,
}: {
  category: CategoryKey;
  products: Product[];
  locale: Locale;
}) {
  const copy = categoryCopy(category, locale);
  const label = locale === 'ar' ? CATEGORIES[category].ar : CATEGORIES[category].en;
  const shopPath = locale === 'ar' ? '/ar/shop' : '/shop';
  const homePath = locale === 'ar' ? '/ar' : '/';

  const breadcrumb = breadcrumbJsonLd([
    { name: t(locale, 'breadcrumb.home'), path: homePath },
    { name: t(locale, 'breadcrumb.shop'), path: shopPath },
    { name: label, path: `${shopPath}/${categorySlug(category, locale)}` },
  ]);

  const others = CATEGORY_KEYS.filter(key => key !== category);

  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(breadcrumb)}
      </script>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(faqJsonLd(copy.faqs))}
      </script>

      <Nav />
      <main className="min-h-screen bg-stone-900 text-[#b3b3b3] pt-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <nav className="mb-8 text-xs text-white/40">
            <Link href={homePath} className="hover:text-white">{t(locale, 'breadcrumb.home')}</Link>
            <span className="mx-2">/</span>
            <Link href={shopPath} className="hover:text-white">{t(locale, 'breadcrumb.shop')}</Link>
            <span className="mx-2">/</span>
            <span className="text-white/70">{label}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-light text-white mb-8">
            {label} {t(locale, 'category.inEgypt')}
          </h1>

          {/* The intro is what makes this page worth indexing. A heading over a
              grid of tiles is a thin page, and a set of them reads as a pattern. */}
          <div className="max-w-3xl space-y-4 mb-16 text-sm leading-relaxed text-[#b3b3b3]">
            {copy.intro.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <h2 className="text-xl font-light text-white mb-8">{t(locale, 'category.productsIn')}</h2>

          {products.length === 0 ? (
            <p className="text-white/40 mb-16">{t(locale, 'shop.empty')}</p>
          ) : (
            <div className="flex flex-wrap gap-6 lg:gap-10 mb-20">
              {products.map(product => (
                <article
                  key={String(product._id)}
                  className="w-[calc(50%-0.75rem)] sm:w-[calc(33.333%-1.5rem)] lg:w-[calc(25%-1.875rem)] max-w-[260px]"
                >
                  <Link href={productPath(product, locale)} className="block group">
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-800 mb-3">
                      {product.mainImage && (
                        <Image
                          src={product.mainImage}
                          alt={localized(product, 'name', locale)}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                    </div>
                    <h3 className="text-sm font-light text-[#b3b3b3] group-hover:underline line-clamp-2">
                      {localized(product, 'name', locale)}
                    </h3>
                    <p className="text-sm font-light text-[#b3b3b3] mt-1">
                      {product.price.toLocaleString('en-US')} {t(locale, 'product.currency')}
                    </p>
                  </Link>
                </article>
              ))}
            </div>
          )}

          <section className="max-w-3xl mb-20">
            <h2 className="text-xl font-light text-white mb-6">{t(locale, 'product.faqs')}</h2>
            <div className="space-y-6">
              {copy.faqs.map((faq, index) => (
                <div key={index} className="border-b border-white/10 pb-5">
                  <h3 className="text-sm font-medium text-white mb-2">{faq.question}</h3>
                  <p className="text-sm leading-relaxed text-[#b3b3b3]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Internal links: these are how Google finds the other category pages
              and how it works out that they belong to one another. */}
          <section>
            <h2 className="text-sm uppercase tracking-widest text-white/40 mb-4">
              {t(locale, 'category.browseOthers')}
            </h2>
            <div className="flex flex-wrap gap-4">
              {others.map(key => (
                <Link
                  key={key}
                  href={`${shopPath}/${categorySlug(key, locale)}`}
                  className="px-4 py-2 border border-white/15 text-sm hover:border-white/40 hover:text-white transition-colors"
                >
                  {locale === 'ar' ? CATEGORIES[key].ar : CATEGORIES[key].en}
                </Link>
              ))}
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
