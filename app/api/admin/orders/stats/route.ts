import { NextResponse } from 'next/server';
import { orderQueries } from '@/order/queries';
import { requireAdmin } from '@/lib/requireAdmin';
import { logger } from '@/utils/logger';

export const runtime = 'nodejs';

/**
 * Dashboard totals, computed in the database.
 *
 * The dashboard used to `fetch('/api/orders?limit=1000')` and add the numbers up
 * in the browser. Three things wrong with that:
 *
 *  - it shipped a thousand complete orders — every customer's name, email, phone
 *    and address — to the client purely to produce four numbers;
 *  - revenue silently stopped being true above 1,000 orders;
 *  - the monthly chart bucketed by `getMonth()` alone, so August 2025 and
 *    August 2026 were added into the same bar.
 *
 * MongoDB does the arithmetic here instead, over every order, and only the
 * totals cross the wire.
 */

/** How many months of history the dashboard chart shows. */
const MONTHS_OF_HISTORY = 12;

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (process.env.MONGO_BYPASS === 'true') {
    return NextResponse.json({
      success: true,
      totalOrders: 0,
      totalRevenue: 0,
      statusCounts: {},
      monthly: [],
      recentOrders: [],
      _notice: 'Database is currently in maintenance mode.',
    });
  }

  try {
    // The first day of the month, MONTHS_OF_HISTORY - 1 months back, so the
    // window always ends with the current month.
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth() - (MONTHS_OF_HISTORY - 1), 1);

    const totals = await orderQueries.dashboardTotals(windowStart);

    const salesByKey = new Map<string, { sales: number; orders: number }>(
      totals.monthlySales.map(row => [`${row.year}-${row.month}`, { sales: row.sales, orders: row.orders }])
    );

    // Emit every month in the window, including the empty ones, so the chart has
    // a continuous axis rather than gaps where nothing was sold.
    const monthly = Array.from({ length: MONTHS_OF_HISTORY }, (_, offset) => {
      const date = new Date(windowStart.getFullYear(), windowStart.getMonth() + offset, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const entry = salesByKey.get(`${year}-${month}`);

      return {
        name: MONTH_NAMES[date.getMonth()],
        year,
        month,
        sales: entry?.sales ?? 0,
        orders: entry?.orders ?? 0,
      };
    });

    return NextResponse.json({
      success: true,
      totalOrders: totals.totalOrders,
      /** Excludes cancelled orders. */
      totalRevenue: totals.totalRevenue,
      paidOrders: totals.paidOrders,
      statusCounts: totals.statusCounts,
      monthly,
      recentOrders: totals.recentOrders.map((order: any) => ({
        _id: String(order._id),
        orderId: order.orderId ?? '',
        customerName: order.customer?.name ?? 'غير معروف',
        status: order.status ?? 'pending',
        total: Number(order.totalAmount) || 0,
        createdAt: order.createdAt ?? order.orderDate ?? null,
      })),
    });
  } catch (error) {
    logger.error('[admin/orders/stats] Failed to build dashboard totals', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load dashboard statistics' },
      { status: 500 }
    );
  }
}
