import Link from 'next/link';
import Image from 'next/image';

import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { t } from '@/i18n';
import type { Locale } from '@/lib/locale';
import { markdownToPlainText } from '@/lib/markdown';
import type { Article } from '@/repositories/articleRepository';

/** The guides listing, in either language. */
export default function GuidesIndex({ articles, locale }: { articles: Article[]; locale: Locale }) {
  const isArabic = locale === 'ar';
  const basePath = isArabic ? '/ar/guides' : '/guides';

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-stone-900 text-[#b3b3b3] pt-20">
        <div className="max-w-[1000px] mx-auto px-6 py-16">

          <h1 className="text-3xl md:text-4xl font-medium text-white mb-4">{t(locale, 'guides.title')}</h1>
          <p className="text-sm max-w-2xl mb-16">{t(locale, 'guides.subtitle')}</p>

          {articles.length === 0 ? (
            <p className="text-white/40">{t(locale, 'guides.empty')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {articles.map(article => {
                const title = (isArabic ? article.titleAr : article.title) || article.title;
                const slug = (isArabic ? article.slugAr : article.slug) || article.slug;
                const excerpt =
                  (isArabic ? article.excerptAr : article.excerpt) ||
                  markdownToPlainText(isArabic ? article.bodyMdAr : article.bodyMd, 140);

                return (
                  <article key={String(article._id)}>
                    <Link href={`${basePath}/${slug}`} className="group block">
                      {article.coverImage && (
                        <div className="relative w-full aspect-[16/9] mb-4 overflow-hidden bg-gray-800">
                          <Image
                            src={article.coverImage}
                            alt={title}
                            fill
                            sizes="(max-width: 768px) 100vw, 480px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <h2 className="text-lg font-medium text-white group-hover:underline">{title}</h2>
                      <p className="text-sm mt-2 leading-relaxed">{excerpt}</p>
                      <span className="inline-block mt-3 text-xs uppercase tracking-widest text-white/50">
                        {t(locale, 'guides.readMore')}
                      </span>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
