import Nav from '@/app/sections/Nav';
import Footer from '@/app/sections/Footer';
import { t } from '@/i18n';
import { directionFor, type Locale } from '@/lib/locale';
import { breadcrumbJsonLd } from '@/product/seo';
import { coachJsonLd, coachPath } from '@/coaches/seo';
import type { PublicCoach } from '@/coaches/schema';

import ProfileHeader from './ProfileHeader';
import ProfileSections from './ProfilePanels';
import styles from './CoachProfile.module.css';

/**
 * One coach's public page, in either language.
 *
 * THE LOOK (30 Oct 2026, third round) — Hatem: "show everything normal in
 * a text, no circles, no border boxes", and small. A short cover, the
 * name and headline, then About · Plans · Certificates · Download app as
 * plain sections, one under the other. No tabs, no cards, no colours.
 *
 *   ProfileHeader  short cover, photo, name, tick, headline, two links
 *   ProfilePanels  every section, as text
 *
 * FAST BY CONSTRUCTION: everything renders on the server, once an hour
 * (the route's `revalidate`), and is served from the CDN. The only
 * JavaScript is the Share button.
 *
 * PARITY — this page is the web half of a pair. Its mate is
 * `Unlimited_app/unlimited/lib/features/coaches/ui/coach_profile_screen.dart`,
 * and the facts both must show are listed in `coaches/schema.ts`.
 *
 * WHAT IS DELIBERATELY MISSING: the follow button, the message button, the
 * review composer. Every one of them needs a signed-in athlete, and this
 * page has no session and never will — the store holds no Supabase login.
 * The one call to action is: talk to us.
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
        className={`${styles.page} min-h-screen bg-stone-900 pt-28 pb-24 text-stone-300 md:pt-32`}
      >
        <div className="mx-auto w-full max-w-[760px] px-4 sm:px-6">
          <ProfileHeader coach={coach} locale={locale} />
          <ProfileSections coach={coach} locale={locale} />
        </div>
      </main>
      <Footer />
    </>
  );
}
