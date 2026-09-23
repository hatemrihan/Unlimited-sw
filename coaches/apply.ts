/**
 * ============================================================
 * unlimited-sw · coaches · apply.ts
 * JOB: the three calls the application page makes — list the free
 *      interview times, send an application, confirm an email.
 * USED BY: app/components/coach-apply/ApplyForm.tsx (a client component).
 * DEPENDS ON: coaches/supabase.ts and the doors from migrations
 *             20260831000100 / 000300 / 000400.
 * RULES: · three named doors, and no table. This file cannot read a
 *          coach_applications row and must never be given a way to
 *        · every failure the applicant can cause has a sentence written
 *          for it. A raw Postgres error must never reach a person
 * ============================================================
 *
 * THIS IS THE ONE PLACE THE STORE WRITES TO THE PLATFORM
 *
 * `coaches/supabase.ts` used to say the store never writes to Supabase.
 * That was true when it only read coach profiles, and it stopped being
 * true here — so it now says what is actually true: the store gets a
 * DOOR, never a table and never a key.
 *
 * The distinction is the whole security model. `apply_to_coach` is a
 * `security definer` function that validates, caps every field, refuses a
 * honeypot and stores an unconfirmed row. The publishable key can call it
 * and can do nothing else — it cannot read an application back, cannot see
 * who else applied, and cannot touch the interview table directly.
 */

import { coachDatabase } from './supabase';

export interface InterviewSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  isBooked: boolean;
}

export interface ApplicationDraft {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  yearsCoaching: number;
  /** ISO date. Required by the form; the door checks 16–80. */
  birthday: string;
  specialities: string;
  portfolioUrl: string;
  whyUs: string;
  slotId: string | null;
  /** The invisible field. A person leaves it empty; a bot fills it in. */
  honeypot: string;
}

/**
 * What happened when we asked for the interview times.
 *
 * `unavailable` is NOT the same as an empty list, and the difference is
 * the whole reason this is a shape rather than an array — see below.
 */
export type SlotsResult =
  | { status: 'ok'; slots: InterviewSlot[] }
  | { status: 'unavailable'; slots: [] };

/**
 * The interview times still open.
 *
 * Free and future only, and the door returns no claimant — a stranger must
 * not be able to work out who else is applying to work here.
 *
 * WHY A FAILED READ IS NOT AN EMPTY LIST
 *
 * This used to `return []` on error, and the page renders an empty list as
 * "No interview times are open right now. Send the form anyway and we will
 * write to you with one."
 *
 * That sentence is a lie when the read failed, and it is an expensive one:
 * every applicant who arrives during a blip is told there is nothing to
 * book, applies without a time, and lands in the queue as somebody the
 * head coach has to chase by hand. Nothing anywhere records that it
 * happened.
 *
 * Still no throw — a scheduling detail must not replace a working form
 * with a stack trace. The caller gets the truth and says "we could not
 * load the times, try again", which is both honest and actionable.
 */
export async function listOpenSlots(locale: 'en' | 'ar'): Promise<SlotsResult> {
  const { data, error } = await coachDatabase().rpc('open_interview_slots');

  if (error) {
    // The fields, not the object: a PostgrestError logs as `{}` in the
    // browser console, which says nothing about what actually failed.
    // A request the browser blocked arrives with every field empty, so
    // the message falls back to the whole error rather than nothing.
    console.error('coach apply: could not list slots', {
      message: error.message || String(error) || 'request blocked or unreachable',
      code: error.code,
      details: error.details,
      hint: error.hint,
      locale,
    });
    return { status: 'unavailable', slots: [] };
  }

  return {
    status: 'ok',
    slots: (data ?? []).map((row: Record<string, any>) => ({
      id: row.id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      isBooked: Boolean(row.is_booked),
    })),
  };
}

/** Everything that can go wrong, in the applicant's own language. */
const MESSAGES: Record<string, { en: string; ar: string }> = {
  INVALID_EMAIL: {
    en: 'That email address does not look right. Check it and try again.',
    ar: 'البريد الإلكتروني غير صحيح. راجعه وحاول مرة أخرى.',
  },
  BIRTHDAY_INVALID: {
    en: 'Check your date of birth. You must be at least 16.',
    ar: 'راجع تاريخ ميلادك. يجب ألا يقل عمرك عن 16 عامًا.',
  },
  NAME_REQUIRED: {
    en: 'Please write your full name.',
    ar: 'اكتب اسمك الكامل.',
  },
  WHY_US_REQUIRED: {
    en: 'Tell us a little about what you coach.',
    ar: 'اكتب لنا نبذة عما تدرّبه.',
  },
  PORTFOLIO_REQUIRED: {
    en: 'Add your Instagram or a link to your work.',
    ar: 'أضف حسابك على إنستغرام أو رابطًا لأعمالك.',
  },
  // The table's own CHECK rules (coach_applications). The door validates
  // only some fields itself; a value that breaks one of these arrives as
  // 'violates check constraint "<name>"', so the name is the code.
  application_phone_length: {
    en: 'Check your phone number. It should be at least 6 digits.',
    ar: 'راجع رقم هاتفك. يجب ألا يقل عن 6 أرقام.',
  },
  application_city_length: {
    en: 'Write your city.',
    ar: 'اكتب مدينتك.',
  },
  application_specialities_length: {
    en: 'Write what you specialise in.',
    ar: 'اكتب تخصصاتك.',
  },
  application_years_sane: {
    en: 'Years coaching must be a number between 0 and 70.',
    ar: 'سنوات الخبرة يجب أن تكون رقمًا بين 0 و70.',
  },
  application_birthday_sane: {
    en: 'Check your date of birth. You must be at least 16.',
    ar: 'راجع تاريخ ميلادك. يجب ألا يقل عمرك عن 16 عامًا.',
  },
  application_why_length: {
    en: 'Write at least one sentence about what you coach.',
    ar: 'اكتب جملة واحدة على الأقل عما تدرّبه.',
  },
  application_name_length: {
    en: 'Please write your full name.',
    ar: 'اكتب اسمك الكامل.',
  },
  application_email_length: {
    en: 'That email address does not look right. Check it and try again.',
    ar: 'البريد الإلكتروني غير صحيح. راجعه وحاول مرة أخرى.',
  },
  application_portfolio_length: {
    en: 'Add your Instagram or a link to your work.',
    ar: 'أضف حسابك على إنستغرام أو رابطًا لأعمالك.',
  },
  ALREADY_A_COACH: {
    en: 'You already coach with us. Sign in instead.',
    ar: 'أنت مدرب معنا بالفعل. سجّل الدخول بدلًا من ذلك.',
  },
  SLOT_TAKEN: {
    en: 'That slot was just taken — please choose another available time below.',
    ar: 'تم حجز هذا الموعد للتو — يرجى اختيار موعد آخر متاح بالأسفل.',
  },
  SLOT_UNAVAILABLE: {
    en: 'That time is no longer available. Choose another below.',
    ar: 'هذا الموعد لم يعد متاحًا. اختر موعدًا آخر بالأسفل.',
  },
  CHOOSE_A_TIME: {
    en: 'Choose an interview time below.',
    ar: 'اختر موعد المقابلة بالأسفل.',
  },
  UNKNOWN_APPLICATION: {
    en: 'This link has expired. Send the form again and we will email a new one.',
    ar: 'انتهت صلاحية هذا الرابط. أعد إرسال النموذج وسنرسل لك رابطًا جديدًا.',
  },
  ALREADY_CONFIRMED: {
    en: 'This email is already confirmed.',
    ar: 'تم تأكيد هذا البريد من قبل.',
  },
};

const FALLBACK = {
  en: 'Something went wrong sending your application. Please try again.',
  ar: 'تعذّر إرسال طلبك. حاول مرة أخرى.',
};

/**
 * A Postgres error turned into a sentence.
 *
 * The doors raise short codes on purpose — `SLOT_TAKEN`, not a paragraph —
 * so that the wording lives here, in both languages, beside the page that
 * shows it. A code nobody has written a sentence for falls back rather
 * than leaking `P0001` at a stranger.
 */
export function applyError(error: unknown, locale: 'en' | 'ar'): string {
  const raw =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : '';

  for (const [code, sentence] of Object.entries(MESSAGES)) {
    if (raw.includes(code)) return sentence[locale];
  }
  return FALLBACK[locale];
}

/**
 * The same rules the database holds, checked before anything is sent.
 *
 * Returns the sentence for the first problem, or null when the draft will
 * pass. It mirrors, one for one, the door's own checks and the CHECK rules
 * on coach_applications (read from production 12 Sep 2026) — so an
 * applicant hears "check your phone number" in his own language instead
 * of a round trip that ends in "something went wrong". The database stays
 * the wall; this is the sign in front of it.
 */
export function checkDraft(draft: ApplicationDraft, locale: 'en' | 'ar'): string | null {
  const say = (code: string) => MESSAGES[code][locale];
  const length = (value: string) => value.trim().length;

  if (length(draft.fullName) < 2 || length(draft.fullName) > 120) return say('NAME_REQUIRED');

  const email = draft.email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return say('INVALID_EMAIL');

  if (length(draft.phone) < 6 || length(draft.phone) > 40) return say('application_phone_length');
  if (length(draft.city) < 2 || length(draft.city) > 80) return say('application_city_length');

  if (!Number.isInteger(draft.yearsCoaching) || draft.yearsCoaching < 0 || draft.yearsCoaching > 70) {
    return say('application_years_sane');
  }

  // Required by the form (the door allows null). 16 to 80 years ago.
  const born = draft.birthday ? new Date(`${draft.birthday}T00:00:00`) : null;
  const now = new Date();
  const youngest = new Date(now.getFullYear() - 16, now.getMonth(), now.getDate());
  const oldest = new Date(now.getFullYear() - 80, now.getMonth(), now.getDate());
  if (!born || Number.isNaN(born.getTime()) || born > youngest || born < oldest) {
    return say('BIRTHDAY_INVALID');
  }

  if (length(draft.specialities) < 2 || length(draft.specialities) > 400) {
    return say('application_specialities_length');
  }
  if (length(draft.portfolioUrl) < 4 || length(draft.portfolioUrl) > 300) return say('PORTFOLIO_REQUIRED');
  if (length(draft.whyUs) < 10 || length(draft.whyUs) > 2000) return say('application_why_length');

  return null;
}

export type SubmitApplicationResult = {
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  meetLink: string | null;
};

/**
 * Send the application.
 *
 * Directly claims the interview slot if one was selected and returns
 * the booked interview details.
 */
export async function submitApplication(
  draft: ApplicationDraft,
  locale: 'en' | 'ar'
): Promise<SubmitApplicationResult> {
  const { data, error } = await coachDatabase().rpc('apply_to_coach', {
    p_full_name: draft.fullName,
    p_email: draft.email,
    p_phone: draft.phone,
    p_city: draft.city,
    p_years_coaching: draft.yearsCoaching,
    p_specialities: draft.specialities,
    p_portfolio_url: draft.portfolioUrl,
    p_why_us: draft.whyUs,
    p_language: locale,
    p_slot_id: draft.slotId,
    p_honeypot: draft.honeypot,
    // Added 1 Sep 2026 (migration 20260901000100). The planned monthly
    // price was removed from the form on 12 Sep 2026; the door's
    // `p_planned_price_egp` defaults to null, so it is simply not sent.
    p_birthday: draft.birthday || null,
  });

  if (error) throw error;
  const res = (data || {}) as Record<string, unknown>;
  return {
    status: typeof res.status === 'string' ? res.status : 'unconfirmed',
    startsAt: typeof res.starts_at === 'string' ? res.starts_at : null,
    endsAt: typeof res.ends_at === 'string' ? res.ends_at : null,
    meetLink: typeof res.meet_link === 'string' ? res.meet_link : null,
  };
}

/**
 * Confirm the email, which is what actually claims the interview.
 *
 * `slotId` is normally null: the link in the email carries a token and
 * nothing else, and the door falls back to the time he chose on the form.
 * It is passed only on the second attempt, when his first choice was taken
 * while he was reading his inbox.
 */
export async function confirmApplication(
  token: string,
  slotId: string | null = null
): Promise<string> {
  const { data, error } = await coachDatabase().rpc('confirm_application', {
    p_token: token,
    p_slot_id: slotId,
  });

  if (error) throw error;
  return data as string;
}
