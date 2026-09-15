'use client';

import { useCallback, useEffect, useState } from 'react';

import styles from './CoachApply.module.css';
import { APPLY_COPY, type Locale } from './copy';
import {
  applyError,
  checkDraft,
  confirmApplication,
  listOpenSlots,
  submitApplication,
  type InterviewSlot,
} from '@/coaches/apply';

/**
 * The form, the slot picker, and the confirmation link's landing.
 *
 * All three live in one component because they are one conversation with
 * one person, and which of them is on screen depends only on where he is
 * in it.
 *
 * WHY THE SLOTS ARE FETCHED IN THE BROWSER
 *
 * The page around this is static and cached — it is a marketing page and
 * should be. Interview times are not: a slot claimed a minute ago must
 * stop being offered. So the prose is cached and the availability is live,
 * which is also why an empty list is a sentence rather than an error.
 *
 * WHY THE TIMES ARE FORMATTED HERE AND NOT ON THE SERVER
 *
 * `toLocaleString` on the server formats in the server's timezone, which
 * is Netlify's, which is nobody's. Applicants are spread across three
 * zones and somebody arriving an hour late to a meeting with Hatem costs
 * us the coach. In the browser it is the applicant's own clock.
 */
export default function ApplyForm({
  locale,
  confirmToken,
}: {
  locale: Locale;
  confirmToken?: string;
}) {
  const copy = APPLY_COPY[locale];

  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  // `null` until the first read finishes; then whether it worked. An empty
  // list and a failed read look identical on screen unless this is kept.
  const [slotsOk, setSlotsOk] = useState<boolean | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [bookedFor, setBookedFor] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(Boolean(confirmToken));

  const loadSlots = useCallback(() => {
    setSlotsOk(null);
    listOpenSlots(locale).then((result) => {
      setSlots(result.slots);
      setSlotsOk(result.status === 'ok');
    });
  }, [locale]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Arriving from the email: the token is the whole message, and the time
  // he chose on the form is already on his row. A slot is passed only if
  // he is picking again because his first choice went.
  useEffect(() => {
    if (!confirmToken) return;

    confirmApplication(confirmToken)
      .then((startsAt) => {
        setBookedFor(startsAt);
        setConfirming(false);
      })
      .catch((error) => {
        setProblem(applyError(error, locale));
        setConfirming(false);
        // His first choice went while he was reading his email; offer him
        // whatever is left.
        loadSlots();
      });
  }, [confirmToken, locale, loadSlots]);

  function formatSlot(slot: InterviewSlot) {
    const when = new Date(slot.startsAt);
    return {
      day: when.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
      time: when.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Empty "years" must read as missing, not as 0 — Number('') is 0.
    const years = String(form.get('years') ?? '').trim();

    const draft = {
      fullName: String(form.get('fullName') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      city: String(form.get('city') ?? ''),
      yearsCoaching: years === '' ? Number.NaN : Number(years),
      birthday: String(form.get('birthday') ?? ''),
      specialities: String(form.get('specialities') ?? ''),
      portfolioUrl: String(form.get('portfolio') ?? ''),
      whyUs: String(form.get('why') ?? ''),
      slotId: chosen,
      honeypot: String(form.get('company') ?? ''),
    };

    // Say what is wrong before sending, in his language. The database
    // checks the same rules again; this only spares him the round trip.
    const invalid = checkDraft(draft, locale);
    if (invalid) {
      setProblem(invalid);
      return;
    }

    setBusy(true);
    setProblem(null);
    try {
      await submitApplication(draft, locale);
      setSent(true);
    } catch (error) {
      setProblem(applyError(error, locale));
    } finally {
      setBusy(false);
    }
  }

  /** Picking again, because his time was taken while he read his email. */
  async function rebook(slotId: string) {
    if (!confirmToken) return;
    setBusy(true);
    setProblem(null);
    try {
      setBookedFor(await confirmApplication(confirmToken, slotId));
    } catch (error) {
      setProblem(applyError(error, locale));
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return <p className={styles.note}>{copy.confirming}</p>;
  }

  if (bookedFor) {
    const when = new Date(bookedFor);
    return (
      <div className={styles.done}>
        <h2 className={styles.doneTitle}>{copy.confirmedTitle}</h2>
        <p>
          {when.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {' — '}
          {copy.confirmedBody}
        </p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className={styles.done}>
        <h2 className={styles.doneTitle}>{copy.doneTitle}</h2>
        <p>{copy.doneBody}</p>
      </div>
    );
  }

  const slotPicker = (
    <div className={`${styles.field} ${styles.fieldStatic} ${styles.wide}`}>
      <span className={styles.fieldLabel}>{copy.slotsLabel}</span>
      {slotsOk === false ? (
        // NOT "no times are open". The read failed, and telling him there
        // is nothing to book sends him into the queue without a time for
        // somebody to chase by hand.
        <p className={styles.tz}>
          {copy.slotsUnavailable}{' '}
          <button type="button" className={styles.retry} onClick={loadSlots}>
            {copy.slotsRetry}
          </button>
        </p>
      ) : slots.length === 0 ? (
        <p className={styles.tz}>
          {slotsOk === null ? copy.slotsLoading : copy.slotsNone}
        </p>
      ) : (
        <>
          <div className={styles.slots}>
            {slots.map((slot) => {
              const { day, time } = formatSlot(slot);
              const on = chosen === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  aria-pressed={on}
                  className={`${styles.slot} ${on ? styles.slotOn : ''}`}
                  onClick={() =>
                    confirmToken ? rebook(slot.id) : setChosen(slot.id)
                  }
                >
                  {day} <time className={styles.latin}>{time}</time>
                </button>
              );
            })}
          </div>
          <p className={styles.tz}>{copy.timezone}</p>
        </>
      )}
    </div>
  );

  // The confirmation link failed — a taken slot, most likely. He does not
  // need the whole form again, only a new time.
  if (confirmToken) {
    return (
      <>
        {problem && <p className={styles.problem}>{problem}</p>}
        <div className={styles.grid2}>{slotPicker}</div>
      </>
    );
  }

  return (
    <form onSubmit={send} noValidate>
      <div className={styles.grid2}>
        <Field name="fullName" label={copy.fields.name}
               placeholder={copy.placeholders.name} required />
        <Field name="email" label={copy.fields.email} type="email" ltr
               placeholder={copy.placeholders.email}
               hint={copy.hints.email} required />
        <Field name="phone" label={copy.fields.phone} type="tel" ltr
               placeholder={copy.placeholders.phone} required />
        <Field name="city" label={copy.fields.city}
               placeholder={copy.placeholders.city} required />
        <Field name="years" label={copy.fields.years} type="number" ltr
               placeholder={copy.placeholders.years} required />
        <Field name="birthday" label={copy.fields.birthday} type="date" ltr
               placeholder={copy.placeholders.birthday} required />
        <Field name="specialities" label={copy.fields.specialities}
               placeholder={copy.placeholders.specialities} required />
        <Field name="portfolio" label={copy.fields.portfolio} wide ltr
               placeholder={copy.placeholders.portfolio}
               hint={copy.hints.portfolio} required />

        {/* Textarea BEFORE its label: the floating label reads the field's
            state with `:placeholder-shown + label`, which only looks forward. */}
        <div className={`${styles.field} ${styles.wide}`}>
          <textarea id="why" name="why" required
                    placeholder={copy.placeholders.why} />
          <label className={styles.fieldLabel} htmlFor="why">
            {copy.fields.why}
          </label>
        </div>

        {/* Invisible to a person, irresistible to a bot. The door refuses
            any application that arrives with this filled in — silently,
            because telling a bot it was caught teaches it to stop. */}
        <div className={styles.trap} aria-hidden="true">
          <label htmlFor="company">Company</label>
          <input id="company" name="company" tabIndex={-1} autoComplete="off" />
        </div>

        {slotPicker}
      </div>

      {problem && <p className={styles.problem}>{problem}</p>}

      <div className={styles.actions}>
        <button className={styles.go} type="submit" disabled={busy}>
          {busy ? copy.sending : `${copy.send} ↗`}
        </button>
        <p className={styles.note}>{copy.sendNote}</p>
      </div>
    </form>
  );
}

function Field({
  name, label, placeholder, hint, type = 'text',
  required = false, wide = false, ltr = false,
}: {
  name: string;
  label: string;
  placeholder: string;
  hint?: string;
  type?: string;
  required?: boolean;
  wide?: boolean;
  ltr?: boolean;
}) {
  return (
    <div className={`${styles.field} ${wide ? styles.wide : ''}`}>
      {/* Input BEFORE its label — the contact form's floating label reads
          the input's state with `:placeholder-shown + label`. The
          placeholder is never visible; it only has to be non-empty. */}
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder || ' '}
        className={ltr ? styles.ltrField : undefined}
        {...(type === 'number' ? { min: 0, max: 70 } : {})}
      />
      <label className={styles.fieldLabel} htmlFor={name}>{label}</label>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
