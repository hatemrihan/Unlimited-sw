/**
 * Old reviews were stored with the contact details appended as their own
 * lines ("From: …", "Email: …", "Phone: …"). Only lines that START with one
 * of those are dropped.
 *
 * It used to cut at the word anywhere in the text, so "I ordered from:
 * Alexandria and…" was shown as "I ordered" — the cut-off reviews found in
 * the 30 Oct 2026 audit.
 */
export function cleanFeedbackMessage(message: string): string {
  const clean = message
    .split('\n')
    .filter(line => !/^\s*(From|Email|Phone):/i.test(line))
    .join('\n')
    .trim();
  return clean || message;
}
