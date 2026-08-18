"use client";

import { useEffect, useState } from 'react';

/**
 * Types `text` out one character at a time.
 *
 * This is the only part of /about that needs the browser, so it lives in its own
 * client component and the page itself stays a server component.
 *
 * The full sentence is always rendered in a visually-hidden span, so the HTML the
 * server sends contains the complete headline — crawlers, link previews and screen
 * readers get the whole sentence immediately, while sighted visitors get the
 * animation. Anyone whose device asks for reduced motion gets the text at once.
 */
export default function HeaderTypewriter({
  text,
  delay = 0,
  speed = 90,
  className = '',
}: {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
}) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    // Respect the OS-level "reduce motion" accessibility setting.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedText(text);
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;

    const timeout = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i += 1;
        setDisplayedText(text.slice(0, i));
        if (i >= text.length && interval) {
          clearInterval(interval);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, delay, speed]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={className}>
        {displayedText}
        {/* The cursor is decoration — never announced, and still for reduced motion. */}
        <span className="animate-pulse motion-reduce:animate-none ml-2 opacity-50 font-light">|</span>
      </span>
    </>
  );
}
