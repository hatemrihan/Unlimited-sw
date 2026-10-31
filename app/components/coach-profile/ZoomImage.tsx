'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * A picture that opens bigger ON THE SAME PAGE when tapped (Hatem, 30 Oct
 * 2026: "don't open a new tab, keep me in the same page, I just want it
 * bigger"). Tap again, the ✕, the dark around it, or Escape closes it.
 *
 * Plain <img>s, not next/image: the platform's storage is not a
 * configured image host, and every Vercel transformation is counted.
 */
export default function ZoomImage({
  src,
  alt,
  className,
  wrapperClassName,
  priority = false,
  closeLabel,
}: {
  src: string;
  alt: string;
  className: string;
  wrapperClassName?: string;
  priority?: boolean;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = scroll;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`block cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${wrapperClassName ?? ''}`}
      >
        <img
          src={src}
          alt={alt}
          decoding="async"
          {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
          className={`${className} transition-opacity hover:opacity-90`}
        />
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt || closeLabel}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-stone-950/90 p-4 backdrop-blur-sm"
          >
            <button
              type="button"
              aria-label={closeLabel}
              autoFocus
              className="absolute end-4 top-4 h-9 w-9 rounded-full text-xl leading-none text-stone-300 hover:text-white"
            >
              ✕
            </button>
            <img
              src={src}
              alt={alt}
              className="max-h-[88vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>,
          document.body
        )}
    </>
  );
}
