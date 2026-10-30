'use client';

import { useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { Locale } from '@/lib/locale';

/**
 * What a visitor sees when the coaching platform could not be read
 * (coaches/api.ts throws CoachReadError, or anything else on the page
 * throws) and there is no good cached copy to show instead.
 *
 * The words live here, not in i18n/: this file is client JavaScript that
 * ships with every coach page, and importing the dictionaries would ship
 * both whole languages for three lines. Tone (Hatem, 29 Aug 2026): say what
 * happened, then what to do. No apology, Modern Standard Arabic.
 *
 * "Try again" refreshes the server render, then resets the boundary —
 * resetting alone would only re-render the same failed result.
 */
const WORDS = {
  en: {
    title: 'The coach page could not be loaded.',
    retry: 'Try again',
    home: 'Back to the store',
  },
  ar: {
    title: 'تعذّر تحميل صفحة المدرب.',
    retry: 'أعد المحاولة',
    home: 'العودة إلى المتجر',
  },
} as const;

export default function CoachPageError({
  error,
  reset,
  locale,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  locale: Locale;
}) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const words = WORDS[locale];

  useEffect(() => {
    console.error('[coach page]', error.digest ?? error.message);
  }, [error]);

  return (
    <main
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="grid min-h-screen place-items-center bg-stone-900 px-4"
    >
      <div role="alert" className="w-full max-w-sm text-center">
        <p className="text-[15px] text-stone-100">{words.title}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-[13px]">
          <button
            type="button"
            disabled={retrying}
            onClick={() =>
              startRetry(() => {
                router.refresh();
                reset();
              })
            }
            className="rounded-full bg-stone-100 px-4 py-2 font-medium text-stone-900 transition hover:bg-white disabled:opacity-60"
          >
            {words.retry}
          </button>
          <Link
            href={locale === 'ar' ? '/ar' : '/'}
            className="rounded-full border border-white/15 px-4 py-2 text-stone-200 transition hover:bg-white/10"
          >
            {words.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
