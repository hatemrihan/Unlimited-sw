/**
 * ============================================================
 * unlimited-sw · coaches · supabase.ts
 * JOB: the one connection from this store to the coaching platform's
 *      database.
 * USED BY: coaches/api.ts (reads) and coaches/apply.ts (three doors).
 * DEPENDS ON: NEXT_PUBLIC_SUPABASE_URL and
 *             NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 * RULES: · this store gets a DOOR, never a table and never a key
 *        · only the publishable (anon) key belongs here
 *        · Mongo stays the store's own database; this is a window into
 *          somebody else's
 * ============================================================
 *
 * A CORRECTION, 31 AUG 2026
 *
 * This file used to say "this store NEVER writes to Supabase — not once,
 * not ever". That was true while it only read coach profiles, and it
 * stopped being true when coach applications arrived: `apply_to_coach`
 * and `confirm_application` are writes, made with the key below.
 *
 * The rule is corrected rather than quietly outgrown, because a rule
 * everybody knows is broken protects nothing. What survives is the part
 * that was always doing the work:
 *
 *   the store may call a NAMED DOOR. It may not touch a table, and it may
 *   never hold a key that could.
 *
 * A door is a `security definer` function the platform wrote, which
 * validates its arguments, caps every field and decides for itself what it
 * will do. Handing the store one is nothing like handing it write access:
 * `apply_to_coach` can create an unconfirmed application and literally
 * nothing else — it cannot read one back, cannot see who else applied, and
 * cannot reach the interview table.
 *
 * WHY A SECOND DATABASE AT ALL
 *
 * This store runs on MongoDB and owns products, orders and reviews. The
 * coaching platform — the mobile app and the admin dashboard — runs on
 * Supabase and owns coaches, programmes and athletes. Two products, two
 * databases, and until now no connection between them.
 *
 * Public coach profiles are the one place the two must meet, because a
 * coach profile's whole job is to be *found*: indexed by Google, shared in
 * a WhatsApp thread, linked from a programme. That is marketing, and
 * marketing lives on the store where the SEO authority already is.
 *
 * WHY THE LIMIT IS STRUCTURAL, NOT A PROMISE
 *
 * The key below is the publishable one — the same key the phone app ships
 * with. Row security decides what it may see, and the coaching platform's
 * policies allow this key to read a coach card only when
 * `status = 'active'`. The application tables are readable by nobody
 * holding this key at all.
 *
 * There is no service key in this repository and there must never be one.
 * If a future feature here needs to do something the doors do not allow,
 * it gets another door — written on the platform side, where the rules
 * live — and never a stronger key.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Built on first use and reused, never at import time.
 *
 * The same lesson as `email/client.ts`: building it at import made every
 * cold start pay for it even on requests that never touch coaches, and it
 * threw during the build when the env vars were absent.
 */
export function coachDatabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // No fallback. A missing secret must fail loudly here rather than
  // silently serving an empty coach list that looks like "no coaches yet".
  if (!url || !key) {
    throw new Error(
      'Coach pages need NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Set them in .env.local and ' +
        'in Netlify. Both are public values — the publishable key is the ' +
        'same one the mobile app ships with.'
    );
  }

  client = createClient(url, key, {
    auth: {
      // Nobody signs in on these pages. Without this the client tries to
      // persist and refresh a session that will never exist, which on the
      // server is pointless work and on the browser writes storage the
      // store has no reason to touch.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}
