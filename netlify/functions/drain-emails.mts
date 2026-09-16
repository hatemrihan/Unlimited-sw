/**
 * Runs the email drain once a minute.
 *
 * Deliberately does nothing itself except call the application. A Netlify
 * function is bundled separately from the Next build, so importing the services
 * directly would mean a second copy of Mongoose, the models and the path
 * aliases — and a deployment where the queue silently drains a different
 * database than the one the site writes to. A fetch to our own endpoint keeps
 * exactly one copy of the logic.
 *
 * A minute is a deliberately unremarkable cadence: the inline send already
 * handles the overwhelming majority of orders, so this normally finds nothing
 * to do. It exists for the minority where SMTP was slow or the function died,
 * and for those a delay of up to a minute is invisible next to never.
 */
export default async function drainEmails() {
  const secret = process.env.DRAIN_SECRET;
  const site = process.env.URL; // Netlify sets this to the deployed site's URL.

  if (!secret || !site) {
    console.error('[drain-emails] DRAIN_SECRET or URL is not set — skipping this run.');
    return;
  }

  try {
    const response = await fetch(`${site}/api/internal/drain-emails`, {
      method: 'POST',
      headers: { 'x-drain-secret': secret },
    });

    if (!response.ok) {
      console.error(`[drain-emails] Drain returned ${response.status}.`);
      return;
    }

    const result = await response.json();
    // Only worth a line when something actually happened; a quiet minute is
    // the normal case and does not need announcing.
    if (result.sent > 0 || result.failed > 0) {
      console.log(`[drain-emails] sent=${result.sent} failed=${result.failed}`);
    }
  } catch (error) {
    console.error('[drain-emails] Could not reach the drain endpoint.', error);
  }
}

// Untyped on purpose: `@netlify/functions` is not a dependency of this project,
// and adding one for a single type would be the tail wagging the dog. Netlify
// reads this export as it is.
export const config = {
  schedule: '*/30 * * * *',
};
