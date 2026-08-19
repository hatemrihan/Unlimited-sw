import Link from 'next/link';
import Image from 'next/image';

import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { renderMarkdown } from '@/lib/markdown';
import { t } from '@/i18n';
import { absoluteUrl, type Locale } from '@/lib/locale';
import { breadcrumbJsonLd, localized, productPath } from '@/product/seo';
import type { Article } from '@/repositories/articleRepository';
import type { Product } from '@/product/model';

/**
 * One guide, in either language.
 *
 * The body is rendered from Markdown on the server. `[[product:slug]]` becomes a
 * real product card rather than injected HTML, so the card is a React component
 * with a working link and an optimised image.
 */
export default function GuideArticle({
  article,
  products,
  locale,
}: {
  article: Article;
  products: Product[];
  locale: Locale;
}) {
  const isArabic = locale === 'ar';
  const title = (isArabic ? article.titleAr : article.title) || article.title;
  const body = (isArabic ? article.bodyMdAr : article.bodyMd) || article.bodyMd;
  const slug = (isArabic ? article.slugAr : article.slug) || article.slug;

  const guidesPath = isArabic ? '/ar/guides' : '/guides';
  const homePath = isArabic ? '/ar' : '/';

  const { html } = renderMarkdown(body);
  const bySlug = new Map(products.map(p => [String(p.slug || p._id), p]));

  // Split on the product markers so each card renders as a component.
  const segments = html.split(/(<!--product:.+?-->)/g);

  const breadcrumb = breadcrumbJsonLd([
    { name: t(locale, 'breadcrumb.home'), path: homePath },
    { name: t(locale, 'guides.title'), path: guidesPath },
    { name: title, path: `${guidesPath}/${slug}` },
  ]);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    image: article.coverImage ? [article.coverImage] : ['https://unlimited-sw.com/og-image.jpg'],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    inLanguage: isArabic ? 'ar-EG' : 'en-EG',
    author: {
      '@type': 'Person',
      name: isArabic ? 'د. محمد القاضي' : 'Dr. Mohamed Alkady',
      url: absoluteUrl(isArabic ? '/ar/about' : '/about'),
      sameAs: [
        'https://www.instagram.com/unlimited_sw',
        'https://www.facebook.com/unlimited.sw',
      ],
    },
    publisher: {
      '@type': 'Organization',
      name: 'Unlimited SW',
      logo: { '@type': 'ImageObject', url: 'https://unlimited-sw.com/logo.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`${guidesPath}/${slug}`) },
  };

  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(articleJsonLd)}
      </script>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(breadcrumb)}
      </script>

      <Nav />
      <main className="min-h-screen bg-stone-900 text-[#b3b3b3] pt-20">
        <article className="max-w-[760px] mx-auto px-6 py-16">

          <nav className="mb-8 text-xs text-white/40">
            <Link href={homePath} className="hover:text-white">{t(locale, 'breadcrumb.home')}</Link>
            <span className="mx-2">/</span>
            <Link href={guidesPath} className="hover:text-white">{t(locale, 'guides.title')}</Link>
          </nav>

          <h1 className="text-3xl md:text-4xl font-medium text-white leading-tight mb-6">{title}</h1>

          <p className="text-xs text-white/40 mb-10">
            {t(locale, 'guides.by')} {isArabic ? 'د. محمد القاضي' : 'Dr. Mohamed Alkady'}
            {article.publishedAt && (
              <>
                {' · '}
                {t(locale, 'guides.publishedOn')}{' '}
                {new Date(article.publishedAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-GB')}
              </>
            )}
          </p>

          {article.coverImage && (
            <div className="relative w-full aspect-[16/9] mb-12 overflow-hidden">
              <Image src={article.coverImage} alt={title} fill sizes="760px" className="object-cover" />
            </div>
          )}

          <div className="text-sm md:text-base">
            {segments.map((segment, index) => {
              const marker = segment.match(/^<!--product:(.+?)-->$/);

              if (marker) {
                const product = bySlug.get(marker[1]);
                // A shortcode pointing at a deleted or renamed product renders
                // nothing rather than an empty box.
                if (!product) return null;

                return (
                  <Link
                    key={index}
                    href={productPath(product, locale)}
                    className="flex gap-4 items-center my-8 p-4 border border-white/10 hover:border-white/30 transition-colors group"
                  >
                    {product.mainImage && (
                      <div className="relative w-20 h-24 shrink-0 overflow-hidden bg-gray-800">
                        <Image src={product.mainImage} alt={localized(product, 'name', locale)} fill sizes="80px" className="object-cover" />
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium group-hover:underline">
                        {localized(product, 'name', locale)}
                      </p>
                      <p className="text-sm mt-1">
                        {product.price.toLocaleString('en-US')} {t(locale, 'product.currency')}
                      </p>
                    </div>
                  </Link>
                );
              }

              // Escaped at render time in lib/markdown — see the tests there.
              return <div key={index} dangerouslySetInnerHTML={{ __html: segment }} />;
            })}
          </div>

        </article>
      </main>
      <Footer />
    </>
  );
}
