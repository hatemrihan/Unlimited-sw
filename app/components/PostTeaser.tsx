import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { t } from '@/i18n';
import { directionFor, type Locale } from '@/lib/locale';
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  androidOpenUrl,
  postUrl,
  type PostTeaser as Teaser,
} from '@/coaches/posts';

/**
 * The page a shared post link opens when the app is not there to catch
 * it: /p/<id>.
 *
 * WHO READS IT: somebody a member sent a link to on WhatsApp. They learn
 * who posted, and how to get to it — the app. Nothing a member wrote is on
 * this page: the community is for members (Hatem, 19 Oct 2026).
 */
export default function PostTeaser({
  id,
  teaser,
  locale,
  android,
}: {
  id: string;
  teaser: Teaser | null;
  locale: Locale;
  /** The visitor is on Android: "open" can be an intent link. */
  android: boolean;
}) {
  return (
    <>
      <Nav />
      <main dir={directionFor(locale)} className="min-h-screen bg-stone-900 text-[#b3b3b3] pt-32 pb-24">
        <div className="max-w-[560px] mx-auto px-6">
          <p className="text-xs uppercase tracking-widest text-white/40">{t(locale, 'post.eyebrow')}</p>

          {teaser ? (
            <section data-testid="post-teaser" className="mt-6 border border-white/15 p-6 md:p-8">
              <div className="flex items-center gap-4">
                {teaser.authorAvatarUrl ? (
                  <img
                    src={teaser.authorAvatarUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full object-cover bg-white/10"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-white/10" aria-hidden />
                )}
                <h1 className="text-xl md:text-2xl font-medium text-white">
                  {t(locale, 'post.title').replace('{name}', teaser.authorName)}
                </h1>
              </div>
              <p className="mt-5 text-sm text-white/70">{t(locale, 'post.body')}</p>

              <div className="mt-8 flex flex-col gap-3">
                <a
                  data-testid="open-in-app"
                  href={android ? androidOpenUrl(id) : postUrl(id)}
                  className="bg-white text-stone-900 text-center px-6 py-3 text-sm font-medium hover:bg-white/90"
                >
                  {t(locale, 'post.open')}
                </a>
                <a
                  href={PLAY_STORE_URL}
                  className="border border-white/30 text-white text-center px-6 py-3 text-sm hover:bg-white hover:text-stone-900 transition-colors"
                >
                  {t(locale, 'post.getAndroid')}
                </a>
                {APP_STORE_URL && (
                  <a
                    href={APP_STORE_URL}
                    className="border border-white/30 text-white text-center px-6 py-3 text-sm hover:bg-white hover:text-stone-900 transition-colors"
                  >
                    {t(locale, 'post.getIos')}
                  </a>
                )}
              </div>
              <p className="mt-6 text-xs text-white/40">{t(locale, 'post.alreadyHave')}</p>
            </section>
          ) : (
            <section data-testid="post-unavailable" className="mt-6 border border-white/15 p-6 md:p-8">
              <h1 className="text-xl font-medium text-white">{t(locale, 'post.unavailableTitle')}</h1>
              <p className="mt-3 text-sm text-white/70">{t(locale, 'post.unavailableBody')}</p>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
