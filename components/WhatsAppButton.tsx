"use client";

import { useEffect, useId, useRef, useState } from 'react';

import { FALLBACK_CONTACT } from '@/payments/contact-values';
import styles from './whatsapp/WhatsAppButton.module.css';
import { isLightColour, WHATSAPP_TOPICS, whatsappLink } from './whatsapp/topics';

/**
 * The WhatsApp button (redesigned 3 Nov 2026, Hatem's pick: underlined,
 * no pill, no box).
 *
 * "Questions?" opens four topics in Arabic; each is a real link that opens
 * WhatsApp with its question already typed. Replaced: a pill that pulsed
 * forever, a fake "1" badge, a hover tip that never showed, a greeting
 * with its halves swapped, and window.open (which Instagram's and
 * Facebook's in-app browsers block).
 *
 * `phone` comes from the coaching platform's /settings (payments/contact.ts),
 * changed on the dashboard and logged there. International form.
 */
export default function WhatsAppButton({ phone = FALLBACK_CONTACT.whatsapp }: { phone?: string }) {
  const [open, setOpen] = useState(false);
  const [away, setAway] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  // Close on Escape, or a tap anywhere outside the menu.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        openerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  // Step aside while the feedback form is on screen: it must never cover Send.
  useEffect(() => {
    const form = document.getElementById('feedbackform');
    if (!form || typeof IntersectionObserver === 'undefined') return;
    const watch = new IntersectionObserver(([entry]) => {
      setAway(entry.isIntersecting);
      if (entry.isIntersecting) setOpen(false);
    }, { threshold: 0.15 });
    watch.observe(form);
    return () => watch.disconnect();
  }, []);

  // What is behind the button? Black words over a light section, white over
  // a dark one. Read from the page's own colours on scroll, once a frame.
  const [onLight, setOnLight] = useState(false);
  useEffect(() => {
    let frame = 0;
    const look = () => {
      frame = 0;
      const root = rootRef.current;
      if (!root) return;
      const box = root.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.bottom - 12;
      const under = document.elementsFromPoint(x, y).find((el) => !root.contains(el));
      for (let el: Element | null = under ?? null; el; el = el.parentElement) {
        const light = isLightColour(getComputedStyle(el).backgroundColor);
        if (light !== null) {
          setOnLight(light);
          return;
        }
      }
      setOnLight(false);
    };
    const later = () => {
      if (!frame) frame = requestAnimationFrame(look);
    };
    look();
    // Again once the page has settled: a link to #feedbackform scrolls
    // after this first look, and images still loading move the sections.
    const settle = [window.setTimeout(later, 400), window.setTimeout(later, 1500)];
    window.addEventListener('scroll', later, { passive: true });
    window.addEventListener('resize', later);
    window.addEventListener('load', later);
    return () => {
      settle.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('load', later);
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', later);
      window.removeEventListener('resize', later);
    };
  }, []);

  const links = WHATSAPP_TOPICS.map((topic) => ({ ...topic, href: whatsappLink(phone, topic.message) }));
  // No usable number: no button, rather than a link to nowhere.
  if (links.some((l) => !l.href)) return null;

  return (
    <>
      {open && <div className={styles.scrim} aria-hidden="true" />}
      <div
        ref={rootRef}
        className={`${styles.root} ${open ? styles.open : ''} ${away ? styles.away : ''} ${onLight && !open ? styles.onLight : ''}`}
        aria-hidden={away || undefined}
      >
        {open && (
          <ul id={listId} className={styles.list} dir="rtl" lang="ar">
            {links.map((link) => (
              <li key={link.id}>
                <a
                  className={styles.topic}
                  href={link.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <button
          ref={openerRef}
          type="button"
          className={styles.opener}
          aria-expanded={open}
          aria-controls={listId}
          tabIndex={away ? -1 : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.word}>Questions?</span>
          <span className={styles.srOnly}>{open ? 'Close WhatsApp topics' : 'Ask us on WhatsApp'}</span>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            ) : (
              <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.57-.35M12.05 21.78a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88M20.46 3.49A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.42" />
            )}
          </svg>
        </button>
      </div>
    </>
  );
}
