import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { getFunnelReport } from '../../../../analytics/actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The periods the dashboard offers. An allowlist, so `?period=99999d` cannot ask for everything. */
const PERIODS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const DEFAULT_PERIOD = '30d';

/**
 * The funnel report.
 *
 * Admin-only — it lives under `app/api/admin/`, so the guard test picks it up
 * automatically and will fail if `requireAdmin` is ever removed. That matters
 * more than it looks: this endpoint reports revenue and order counts, which is
 * commercially sensitive in a way the storefront's own data is not.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const requested = new URL(request.url).searchParams.get('period') ?? DEFAULT_PERIOD;
  const days = PERIODS[requested] ?? PERIODS[DEFAULT_PERIOD];

  try {
    const report = await getFunnelReport(days);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('[api/admin/funnel] failed:', error);
    return NextResponse.json(
      { success: false, error: 'Could not build the funnel report.' },
      { status: 503 }
    );
  }
}
