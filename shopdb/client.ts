/**
 * ============================================================
 * unlimited-sw · shopdb · client.ts
 * JOB: the one switch (SHOP_DB) and the one connection the store uses
 *      once it sells from Supabase instead of MongoDB.
 * USED BY: every file in shopdb/, and each route that branches on
 *          sellsFromSupabase().
 * RULES: · SERVER ONLY. The service-role key bypasses row security; it
 *          must never reach a browser bundle. Nothing in a client
 *          component imports this file.
 *        · the default is MongoDB. Nothing changes until SHOP_DB is set
 *          to "supabase" on Netlify, at the cutover (SHOP-ORDERS-PLAN.md)
 * ============================================================
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Which database the shop lives in, read on every call rather than once at
 * start-up, so the cutover is "change one Netlify variable, redeploy" and a
 * test can flip it.
 */
export function sellsFromSupabase(): boolean {
  return (process.env.SHOP_DB ?? 'mongo').trim().toLowerCase() === 'supabase';
}

let client: SupabaseClient | null = null;

/**
 * The store's server, as the service role. A web customer has no Supabase
 * session — that was the decision on 5 Sep 2026 — so checkout places the
 * order with this key, and the database's door does the checking.
 */
export function shopDb(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SHOP_DB=supabase needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
        '(server-only, Netlify → Site settings → Environment variables, scope: Functions).'
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // The database's audit trail tells the dashboard from the store by this.
    global: { headers: { 'x-client-info': 'supabase-js/unlimited-sw' } },
  });
  return client;
}

/** For tests: forget the cached connection. */
export function resetShopDbForTests(): void {
  client = null;
}

/**
 * Where the head coach now runs orders, payments and shop settings
 * (decision 16 Oct 2026). The store's old admin pages answer with this.
 */
export function dashboardShopUrl(): string {
  const base = (process.env.DASHBOARD_URL ?? 'https://admin.unlimited-sw.com').replace(/\/+$/, '');
  return `${base}/shop`;
}
