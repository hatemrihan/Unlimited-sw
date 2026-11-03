/**
 * Old reviews were stored with the contact details appended as their own
 * lines ("From: …", "Email: …", "Phone: …"). Only lines that START with one
 * of those are dropped.
 *
 * It used to cut at the word anywhere in the text, so "I ordered from:
 * Alexandria and…" was shown as "I ordered" — the cut-off reviews found in
 * the 30 Oct 2026 audit.
 */
/**
 * The reviewer's name: the name field, or — on the oldest reviews, which
 * kept it inside the text — the "From: …" line. Empty when there is none
 * (such a review is not shown).
 */
export function reviewName(review: { name?: string; message: string }): string {
  if (review.name && review.name.trim()) return review.name.trim();
  const from = review.message.match(/^\s*From:\s*([^\n]+)/im);
  return from ? from[1].split(/Email:/i)[0].trim() : '';
}

export function cleanFeedbackMessage(message: string): string {
  const clean = message
    .split('\n')
    .filter(line => !/^\s*(From|Email|Phone):/i.test(line))
    .join('\n')
    .trim();
  return clean || message;
}
