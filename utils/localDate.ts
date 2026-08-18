/**
 * Date helpers for admin forms that deal in calendar days, not instants.
 *
 * THE BUG THESE EXIST TO PREVENT:
 *
 * `date.toISOString().split('T')[0]` looks like "give me the date part", but
 * toISOString() converts to UTC first. Egypt runs at UTC+2/+3, so a date picked
 * in Cairo is local midnight — which is the PREVIOUS day in UTC:
 *
 *   picked   15 Aug 2026, 00:00 Cairo (UTC+3)
 *   UTC      14 Aug 2026, 21:00
 *   saved    "2026-08-14"   ← a day early
 *
 * A promo code set to expire on the 15th therefore died on the 14th, and nobody
 * could see why. The fix is to read the calendar fields the user actually saw
 * rather than converting to another timezone first.
 */

/** `2026-08-15` from the date as the user's own calendar shows it. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses `2026-08-15` as local midnight.
 *
 * `new Date('2026-08-15')` is parsed by the browser as UTC midnight, which in
 * Cairo displays as 02:00 or 03:00 on the 15th — usually harmless, but it shows
 * the wrong day for timezones behind UTC, and it makes round-tripping a picked
 * date unreliable.
 */
export function fromLocalDateString(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

/** Today, as `YYYY-MM-DD`, in the viewer's own timezone. */
export function todayLocal(): string {
  return toLocalDateString(new Date());
}

/** `days` from today, as `YYYY-MM-DD`, in the viewer's own timezone. */
export function daysFromTodayLocal(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}
