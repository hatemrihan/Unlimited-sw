import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { t } from '@/i18n';
import { directionFor, type Locale } from '@/lib/locale';
import { breadcrumbJsonLd } from '@/product/seo';
import { coachJsonLd, coachPath } from '@/coaches/seo';
import type { PublicCoach } from '@/coaches/schema';

import ProfileHeader from './ProfileHeader';
import ProfilePills from './ProfilePills';
import ProfileCards from './ProfileCards';
import styles from './CoachProfile.module.css';

/**
 * One coach's public page, in either language.
 *
 * THE LOOK (30 Oct 2026) — two pictures Hatem picked. The top is a
 * portfolio header: a small photo, the name and @handle, one big line, a
 * row of chips. Under it, a row of pills and a wall of coloured cards.
 * The stone page stays; the cards carry the colour.
 *
 *   ProfileHeader  photo, name, tick, headline, chips, Certified badges
 *   ProfilePills   About · Programmes · Certificates · Train — jump links
 *   ProfileCards   the wall: about, status, train, rating, followers,
 *                  one card per plan, per certificate, and the cover
 *
 * FAST BY CONSTRUCTION: everything here renders on the server, once an
 * hour (the route's `revalidate`), and is served from the CDN. The only
 * JavaScript this page adds is ShareChip, one button. The pills are plain
 * links and the glow on the card they point at is CSS (:target).
 *
 * PARITY — this page is the web half of a pair. Its mate is
 * `Unlimited_app/unlimited/lib/features/coaches/ui/coach_profile_screen.dart`,
 * and the facts both must show are listed in `coaches/schema.ts`. The two
 * look different on purpose: the app has tabs because a signed-in athlete
 * has business there (their coach's roster, their own chat), while this
 * page is for a stranger arriving from Google. Same facts, different
 * furniture.
 *
 * WHAT IS DELIBERATELY MISSING: the follow button, the message button, the
 * review composer. Every one of them needs a signed-in athlete, and this
 * page has no session and never will — the store holds no Supabase login.
 * A button that opens a sign-in the store cannot perform would be worse
 * than no button, so the one call to action is: talk to us.
 */
export default function CoachProfile({
  coach,
  locale,
}: {
  coach: PublicCoach;
  locale: Locale;
}) {
  const homePath = locale === 'ar' ? '/ar' : '/';

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
        className={`${styles.page} min-h-screen bg-stone-900 pt-28 pb-24 text-stone-300 md:pt-36`}
      >
        <div className="mx-auto w-full max-w-[1040px] px-4 sm:px-6">
          <ProfileHeader coach={coach} locale={locale} />
          <ProfilePills coach={coach} locale={locale} />
          <ProfileCards coach={coach} locale={locale} />
        </div>
      </main>
      <Footer />
    </>
  );
}
