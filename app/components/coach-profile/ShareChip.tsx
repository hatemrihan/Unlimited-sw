'use client';

import { useEffect, useState } from 'react';
import { Check, Link2, X } from 'lucide-react';

type Outcome = 'idle' | 'copied' | 'failed';

/**
 * Share this coach — the page's only JavaScript.
 *
 * On a phone it opens the system share sheet, where WhatsApp is one tap
 * away. Anywhere else, or if the sheet fails, it copies the link and says
 * so for two seconds. If copying fails too (an old browser, a page not
 * served over https) it says that instead of pretending.
 *
 * The URL comes from the server — the page's canonical address — not from
 * the address bar, so a link with tracking tags or a #pill on it is never
 * what gets shared.
 */
export default function ShareChip({
  url,
  title,
  className,
  words,
}: {
  url: string;
  title: string;
  className: string;
  words: { share: string; copied: string; failed: string };
}) {
  const [outcome, setOutcome] = useState<Outcome>('idle');

  useEffect(() => {
    if (outcome === 'idle') return;
    const timer = window.setTimeout(() => setOutcome('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [outcome]);

  async function share() {
    const isPhone = window.matchMedia('(pointer: coarse)').matches;
    if (isPhone && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // The visitor closed the sheet: that is an answer, not a failure.
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        // Anything else: fall through and copy instead.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setOutcome('copied');
    } catch {
      setOutcome('failed');
    }
  }

  const Icon = outcome === 'copied' ? Check : outcome === 'failed' ? X : Link2;
  const label =
    outcome === 'copied'
      ? words.copied
      : outcome === 'failed'
        ? words.failed
        : words.share;

  return (
    <button type="button" onClick={share} className={className}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      <span aria-live="polite">{label}</span>
    </button>
  );
}
