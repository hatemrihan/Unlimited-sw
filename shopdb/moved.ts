/**
 * ============================================================
 * unlimited-sw · shopdb · moved.ts
 * JOB: the one answer the store's old admin endpoints give after the move:
 *      orders, payments, customers and the shop's switches live in the
 *      dashboard now (decision 16 Oct 2026).
 * USED BY: the admin order, stats, payment-settings and free-shipping
 *          routes, when SHOP_DB=supabase.
 * ============================================================
 */

import { NextResponse } from 'next/server';

import { dashboardShopUrl } from './client';

/** 410 Gone, with where it went. The admin page shows the sentence. */
export function movedToDashboard(what: string): NextResponse {
  const url = dashboardShopUrl();
  return NextResponse.json(
    {
      success: false,
      code: 'MOVED_TO_DASHBOARD',
      error: `${what} are managed in the dashboard now: ${url}`,
      url,
    },
    { status: 410 }
  );
}
