import { t } from '@/i18n';
import type { Locale } from '@/lib/locale';
import type { PublicCoach } from '@/coaches/schema';

import { CARD_IDS } from './ProfileCards';
import styles from './CoachProfile.module.css';

/**
 * The row of pills — the second picture. Each one is a plain link to a
 * card on the wall below (`#plans`), so it works with no JavaScript: the
 * browser scrolls smoothly (CSS) and the card glows when it arrives
 * (CSS :target).
 *
 * The Certificates pill only exists when there is a certificate to jump
 * to. The Programmes pill is always there: "no programmes yet" is still an
 * answer worth finding.
 */
export default function ProfilePills({
  coach,
  locale,
}: {
  coach: PublicCoach;
  locale: Locale;
}) {
  const pills: { id: string; label: string; count?: number }[] = [
    { id: CARD_IDS.about, label: t(locale, 'coach.about') },
    {
      id: CARD_IDS.plans,
      label: t(locale, 'coach.programmes'),
      count: coach.programmes.length,
    },
    ...(coach.certifications.length > 0
      ? [
          {
            id: CARD_IDS.certificates,
            label: t(locale, 'coach.certificates'),
            count: coach.certifications.length,
          },
        ]
      : []),
    { id: CARD_IDS.train, label: t(locale, 'coach.ctaTitle') },
  ];

  const numbers = locale === 'ar' ? 'ar-EG' : 'en-GB';

  return (
    <nav aria-label={t(locale, 'coach.sections')} className="mt-14 md:mt-16">
      <ul className={`${styles.item} flex flex-wrap gap-2`}>
        {pills.map((pill) => (
          <li key={pill.id}>
            <a
              href={`#${pill.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-stone-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
            >
              {pill.label}
              {pill.count !== undefined && pill.count > 0 && (
                <span className="text-stone-500 tabular-nums">
                  {pill.count.toLocaleString(numbers)}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
