import Link from 'next/link';

import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { t } from '@/i18n';
import { directionFor, type Locale } from '@/lib/locale';
import { breadcrumbJsonLd } from '@/product/seo';
import { coachJsonLd, coachPath } from '@/coaches/seo';
import {
  headlineFor,
  programmeTitle,
  type CoachProgramme,
  type PublicCoach,
} from '@/coaches/schema';

/**
 * One coach's public page, in either language.
 *
 * PARITY — this component is the web half of a pair. Its mate is
 * `Unlimited_app/unlimited/lib/features/coaches/ui/coach_profile_screen.dart`,
 * and the facts both must show are listed in `coaches/schema.ts`. The two
 * look different on purpose: the app has tabs because a signed-in athlete
 * has business there (their coach's roster, their own chat), while this
 * page has one column because a stranger arriving from Google has none.
 * Same facts, different furniture.
 *
 * WHAT IS DELIBERATELY MISSING: the follow button, the message button, the
 * review composer. Every one of them needs a signed-in athlete, and this
 * page has no session and never will — the store holds no Supabase login.
 * A button that opens a sign-in the store cannot perform would be worse
 * than no button, so the page ends with the one honest call to action:
 * talk to us.
 */
export default function CoachProfile({
  coach,
  locale,
}: {
  coach: PublicCoach;
  locale: Locale;
}) {
  const isArabic = locale === 'ar';
  const homePath = isArabic ? '/ar' : '/';
  const contactPath = isArabic ? '/ar/contact' : '/contact';
  const headline = headlineFor(coach, locale);

  const breadcrumb = breadcrumbJsonLd([
    { name: t(locale, 'breadcrumb.home'), path: homePath },
    { name: coach.displayName, path: coachPath(coach.username, locale) },
  ]);

  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(coachJsonLd(coach, locale))}
      </script>
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(breadcrumb)}
      </script>

      <Nav />
      <main
        dir={directionFor(locale)}
        className="min-h-screen bg-stone-900 text-[#b3b3b3] pt-20"
      >
        {/* The cover, with the avatar sitting on its lower edge — the same
            arrangement as the app's header, so somebody who has seen one
            recognises the other. */}
        <div className="relative w-full h-[220px] md:h-[300px] bg-stone-800">
          {coach.coverUrl && (
            // A plain <img>, not next/image: these files live on the
            // coaching platform's storage, whose hostname this repo does
            // not configure. Optimisation is off site-wide anyway, so
            // next/image would add a validation step and buy nothing.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coach.coverUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 to-transparent" />
        </div>

        <div className="max-w-[860px] mx-auto px-6">
          <div className="-mt-12 mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-stone-900 bg-stone-800">
              {coach.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coach.avatarUrl}
                  alt={coach.displayName}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-medium text-white leading-tight">
            {coach.displayName}
          </h1>
          <p className="text-xs text-white/40 mt-1">@{coach.username}</p>

          {headline && (
            <p className="mt-4 text-sm md:text-base text-white/70 max-w-[60ch]">
              {headline}
            </p>
          )}

          <Meta coach={coach} locale={locale} />

          {coach.bio?.trim() && (
            <section className="mt-12">
              <h2 className="text-xs uppercase tracking-widest text-white/40 mb-4">
                {t(locale, 'coach.about')}
              </h2>
              <p className="text-sm md:text-base whitespace-pre-line max-w-[65ch]">
                {coach.bio}
              </p>
            </section>
          )}

          <section className="mt-12">
            <h2 className="text-xs uppercase tracking-widest text-white/40 mb-4">
              {t(locale, 'coach.programmes')}
            </h2>

            {coach.programmes.length === 0 ? (
              <p className="text-sm text-white/50">
                {t(locale, 'coach.noProgrammes')}
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {coach.programmes.map((programme) => (
                  <ProgrammeCard
                    key={programme.id}
                    programme={programme}
                    locale={locale}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-16 mb-24 border border-white/10 p-8">
            <h2 className="text-lg text-white mb-3">
              {t(locale, 'coach.ctaTitle')}
            </h2>
            <p className="text-sm mb-6 max-w-[55ch]">
              {t(locale, 'coach.ctaBody')}
            </p>
            <Link
              href={contactPath}
              className="inline-block border border-white/30 px-6 py-3 text-sm text-white hover:bg-white hover:text-stone-900 transition-colors"
            >
              {t(locale, 'coach.ctaButton')}
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * Rating, followers, and whether this coach is open for business.
 *
 * The last one is the fact an athlete actually came for, so it is not
 * buried: a coach who is full says so here rather than after somebody has
 * written them a message.
 */
function Meta({ coach, locale }: { coach: PublicCoach; locale: Locale }) {
  const numbers = locale === 'ar' ? 'ar-EG' : 'en-GB';

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {coach.averageRating !== null && coach.reviewCount > 0 ? (
        <span className="text-white">
          ★ {coach.averageRating.toFixed(1)}
          <span className="text-white/40">
            {' '}
            ({coach.reviewCount.toLocaleString(numbers)}{' '}
            {t(locale, 'coach.reviews')})
          </span>
        </span>
      ) : (
        <span className="text-white/40">{t(locale, 'coach.noRating')}</span>
      )}

      <span className="text-white/60">
        {coach.followerCount.toLocaleString(numbers)}{' '}
        {t(locale, 'coach.followers')}
      </span>

      <span
        className={
          coach.isAcceptingAthletes ? 'text-emerald-400' : 'text-white/40'
        }
      >
        {t(
          locale,
          coach.isAcceptingAthletes ? 'coach.accepting' : 'coach.notAccepting'
        )}
      </span>
    </div>
  );
}

/**
 * A programme, priced, and not a link.
 *
 * Programmes are bought inside the app, not in this shop's basket. A card
 * that looked clickable and went nowhere — or worse, into a checkout that
 * cannot sell it — would be a promise the store cannot keep.
 */
function ProgrammeCard({
  programme,
  locale,
}: {
  programme: CoachProgramme;
  locale: Locale;
}) {
  return (
    <li className="border border-white/10 p-5">
      <p className="text-white text-sm font-medium">
        {programmeTitle(programme, locale)}
      </p>
      <p className="text-xs text-white/40 mt-2">
        {programme.level} · {programme.durationDays} {t(locale, 'coach.days')}
      </p>
      <p className="text-sm mt-3">
        {programme.priceEgp.toLocaleString('en-US')}{' '}
        {t(locale, 'product.currency')}
      </p>
    </li>
  );
}
