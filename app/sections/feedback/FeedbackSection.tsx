import FeedbackSteps from './FeedbackSteps';
import { getPublicReviews } from './reviews';
import { FEEDBACK_WORDS, type FeedbackLocale } from './words';

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';

/**
 * The home page's feedback section (3 Nov 2026), drawn by the server in
 * the page's language: the heading, the one-question-at-a-time form (the
 * only part that runs in the browser) and the approved reviews with their
 * stars. Replaces FeedbackForm.tsx, which loaded only after its JavaScript
 * had, fetched the reviews from each visitor's phone, and squeezed every
 * field to half the screen.
 */
export default async function FeedbackSection({ locale = 'en' }: { locale?: FeedbackLocale }) {
  const w = FEEDBACK_WORDS[locale];
  const reviews = await getPublicReviews();

  return (
    <section
      id="feedbackform"
      className="w-full bg-stone-900 pt-16 pb-28 lg:py-24 scroll-mt-20"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
      aria-labelledby="feedback-title"
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 grid gap-16 lg:grid-cols-2 lg:gap-20 items-start">
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <h2 id="feedback-title" className="text-2xl font-normal text-white leading-tight">{w.title}</h2>
          <p className="mt-1 mb-8 text-sm text-white/60">{w.lead}</p>
          <FeedbackSteps locale={locale} />
        </div>

        {reviews.length > 0 && (
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <h3 className="mb-6 text-xs text-white/60 uppercase tracking-wider">{w.reviews}</h3>
            <ul className="grid gap-6">
              {reviews.map((review) => (
                <li key={review.id} className="grid gap-1.5 border-t border-white/10 pt-5 first:border-0 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white" dir="auto">{review.name}</span>
                    <span className="flex gap-px" role="img" aria-label={`${review.rating}/5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <svg key={n} width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                          <polygon points={STAR_POINTS} fill={n <= review.rating ? '#fafaf9' : 'none'} stroke="#fafaf9" strokeWidth="1" />
                        </svg>
                      ))}
                    </span>
                  </div>
                  <p className="text-sm text-white/55 leading-relaxed whitespace-pre-line break-words" dir="auto">
                    {review.message}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
