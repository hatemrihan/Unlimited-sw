'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './Feedback.module.css';
import { checkStep, FEEDBACK_WORDS, MAX_MESSAGE, type FeedbackLocale } from './words';

type Step = 1 | 2 | 3 | 4;

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
const RING_LENGTH = 56.55; // 2πr, r = 9

/**
 * One question at a time (Hatem's pick, 3 Nov 2026): rating → words →
 * name and email → phone (optional) → send. The rating moves on by itself;
 * every other step checks its own fields before letting him on, in his
 * language. Nothing reloads: the thank-you replaces the form.
 */
export default function FeedbackSteps({ locale }: { locale: FeedbackLocale }) {
  const w = FEEDBACK_WORDS[locale];
  const [step, setStep] = useState<Step>(1);
  const [rating, setRating] = useState(0);
  const [lit, setLit] = useState(0);
  const [values, setValues] = useState({ message: '', name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const stepRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const moved = useRef(false);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Focus the new step's first field, so the keyboard stays up on a phone.
  // Not on first paint: the page must not jump to the form on arrival.
  useEffect(() => {
    if (!moved.current) return;
    const field = stepRef.current?.querySelector<HTMLElement>('textarea, input, button');
    const t = window.setTimeout(() => field?.focus({ preventScroll: true }), 330);
    timers.current.push(t);
  }, [step]);

  const go = (next: Step) => {
    moved.current = true;
    setError('');
    setStep(next);
  };

  const pick = (stars: number) => {
    setRating(stars);
    setLit(0);
    // The stars land one after another, then the next question comes in.
    for (let i = 1; i <= stars; i += 1) {
      timers.current.push(window.setTimeout(() => setLit(i), (i - 1) * 45));
    }
    timers.current.push(window.setTimeout(() => go(2), 450));
  };

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const forward = (from: 2 | 3) => {
    const problem = checkStep(from, values, locale);
    if (problem) {
      setError(problem);
      return;
    }
    go((from + 1) as Step);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          message: values.message.trim(),
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
        }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? w.tooMany : w.failed);
        return;
      }
      setSent(true);
    } catch {
      setError(w.failed);
    } finally {
      setSending(false);
    }
  };

  const again = () => {
    setValues({ message: '', name: '', email: '', phone: '' });
    setRating(0);
    setLit(0);
    setSent(false);
    go(1);
  };

  if (sent) {
    return (
      <div className={styles.done} role="status">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle cx="36" cy="36" r="32" />
          <path d="M23 37l9 9 17-19" />
        </svg>
        <h3 className={styles.question}>{w.thanks}</h3>
        <p className={styles.hint} style={{ margin: 0 }}>{w.thanksBody}</p>
        <button type="button" className={styles.again} onClick={again}>{w.again}</button>
      </div>
    );
  }

  const used = values.message.length;
  const ring = (
    <svg className={`${styles.ring} ${used > MAX_MESSAGE - 50 ? styles.near : ''}`} viewBox="0 0 22 22" aria-hidden="true">
      <circle className={styles.track} cx="11" cy="11" r="9" />
      <circle className={styles.fill} cx="11" cy="11" r="9" style={{ strokeDashoffset: RING_LENGTH * (1 - used / MAX_MESSAGE) }} />
    </svg>
  );
  const backButton = (to: Step) => (
    <button type="button" className={styles.back} onClick={() => go(to)}>{w.back}</button>
  );

  return (
    <form onSubmit={send} noValidate>
      <div
        className={styles.sets}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={step}
        aria-label={w.step.replace('{n}', String(step))}
      >
        {[1, 2, 3, 4].map((n) => (
          <i key={n} className={`${styles.set} ${n <= step ? styles.setOn : ''}`} />
        ))}
      </div>

      <div key={step} ref={stepRef} className={styles.step}>
        {step === 1 && (
          <>
            <p className={styles.question} id="fb-q1">{w.q1}</p>
            <div className={styles.stars} role="radiogroup" aria-labelledby="fb-q1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} · ${w.stars[n]}`}
                  className={`${styles.star} ${n <= lit ? styles.starOn : ''}`}
                  onClick={() => pick(n)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points={STAR_POINTS} /></svg>
                </button>
              ))}
            </div>
            <span className={styles.word} aria-live="polite">{w.stars[rating]}</span>
          </>
        )}

        {step === 2 && (
          <>
            <p className={styles.question}>{w.q2}</p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fb-message">{w.message}</label>
              <textarea
                id="fb-message"
                className={styles.input}
                rows={5}
                maxLength={MAX_MESSAGE}
                placeholder={w.messageHint}
                value={values.message}
                onChange={set('message')}
                dir="auto"
              />
              {ring}
            </div>
            <p className={styles.error} role="alert">{error}</p>
            <div className={styles.row}>
              {backButton(1)}
              <button type="button" className={styles.button} onClick={() => forward(2)}>{w.next}</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className={styles.question}>{w.q3}</p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fb-name">{w.name}</label>
              <input id="fb-name" className={styles.input} autoComplete="name" maxLength={80}
                     placeholder={w.namePlaceholder} value={values.name} onChange={set('name')} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fb-email">{w.email}</label>
              <input id="fb-email" className={styles.input} type="email" inputMode="email" autoComplete="email"
                     dir="ltr" maxLength={200} placeholder="you@example.com" value={values.email} onChange={set('email')} />
            </div>
            <p className={styles.error} role="alert">{error}</p>
            <div className={styles.row}>
              {backButton(2)}
              <button type="button" className={styles.button} onClick={() => forward(3)}>{w.next}</button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className={styles.question}>{w.q4}</p>
            <p className={styles.hint}>{w.q4hint}</p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fb-phone">
                {w.phone} <span className={styles.optional}>{w.optional}</span>
              </label>
              <input id="fb-phone" className={styles.input} type="tel" inputMode="tel" autoComplete="tel"
                     dir="ltr" maxLength={30} placeholder="+20 100 000 0000" value={values.phone} onChange={set('phone')} />
            </div>
            <p className={styles.error} role="alert">{error}</p>
            <button type="submit" className={`${styles.button} ${styles.wide} ${sending ? styles.busy : ''}`} disabled={sending}>
              {sending ? w.sending : w.send}
            </button>
            <div>{backButton(3)}</div>
          </>
        )}
      </div>
    </form>
  );
}
