import { ClientSession } from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Order, { IOrder } from '@/order/model';

/**
 * The ONLY file in the order path that knows MongoDB exists.
 *
 * Mirrors `product/queries.ts`, and for the same reason: a Mongo → Postgres
 * migration is planned, and the product folder survives it because exactly one
 * file has to be rewritten. Orders had no such seam — `models/order.ts` (now `order/model.ts`) was
 * imported directly by four files, each issuing its own `find`, `create`,
 * `findByIdAndUpdate`, `deleteOne`, `countDocuments` and `aggregate`, with
 * `withTransaction`, `.session()`, `$inc`, `$elemMatch` and `$expr` spread
 * across all of them.
 *
 * The rule is the same as for products: routes and services call these methods
 * and never touch the model. Swap `MongoOrderQueries` for a Postgres
 * implementation and nothing above this file changes.
 *
 * Note on sessions: the transaction itself is still owned by the services, which
 * is deliberate. What belongs here is every statement; what belongs there is the
 * business rule about what has to succeed or fail together.
 */

export type SortDirection = 'asc' | 'desc';

export interface ListOrdersOptions {
  skip: number;
  limit: number;
  sortBy: string;
  sortDir: SortDirection;
}

export interface OrderPage {
  orders: any[];
  totalCount: number;
}

export interface DashboardTotals {
  totalOrders: number;
  totalRevenue: number;
  paidOrders: number;
  statusCounts: Record<string, number>;
  monthlySales: Array<{ year: number; month: number; sales: number; orders: number }>;
  recentOrders: any[];
}

export interface OrderQueries {
  /** One page of the admin list, plus the total matching the same filter. */
  listPage(filter: Record<string, unknown>, options: ListOrdersOptions): Promise<OrderPage>;
  findById(id: string, session?: ClientSession): Promise<any | null>;
  /** The order placed under one checkout attempt, if that attempt got through. */
  findByClientOrderId(clientOrderId: string): Promise<any | null>;
  findStatusById(id: string): Promise<{ status: string; stockRestored?: boolean } | null>;
  create(newOrder: Partial<IOrder>, session?: ClientSession): Promise<any>;
  updateStatus(id: string, status: string): Promise<any | null>;
  /** Persists a document the caller mutated inside a transaction. */
  save(order: any, session?: ClientSession): Promise<any>;
  deleteById(id: string, session?: ClientSession): Promise<void>;
  dashboardTotals(windowStart: Date): Promise<DashboardTotals>;
}

/** Cancelled orders are not revenue. */
const EARNS_REVENUE = { status: { $ne: 'cancelled' } };

/** Old orders predate `orderDate`; fall back to the timestamp every doc has. */
const EFFECTIVE_DATE = { $ifNull: ['$orderDate', '$createdAt'] };

export class MongoOrderQueries implements OrderQueries {
  async listPage(
    filter: Record<string, unknown>,
    { skip, limit, sortBy, sortDir }: ListOrdersOptions
  ): Promise<OrderPage> {
    await dbConnect();

    // Counted and fetched together — the count is needed for the pager and the
    // two queries are independent.
    const [totalCount, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ [sortBy]: sortDir === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return { orders, totalCount };
  }

  async findById(id: string, session?: ClientSession): Promise<any | null> {
    await dbConnect();
    const query = Order.findById(id);
    return session ? query.session(session) : query;
  }

  async findByClientOrderId(clientOrderId: string): Promise<any | null> {
    await dbConnect();
    return Order.findOne({ clientOrderId });
  }

  async findStatusById(id: string) {
    await dbConnect();
    return Order.findById(id).select('status stockRestored').lean<{
      status: string;
      stockRestored?: boolean;
    }>();
  }

  async create(newOrder: Partial<IOrder>, session?: ClientSession): Promise<any> {
    await dbConnect();
    // `create` with an array is what supports passing a session.
    const [order] = await Order.create([newOrder], session ? { session } : {});
    return order;
  }

  async updateStatus(id: string, status: string): Promise<any | null> {
    await dbConnect();
    return Order.findByIdAndUpdate(id, { status }, { new: true });
  }

  async save(order: any, session?: ClientSession): Promise<any> {
    return order.save(session ? { session } : {});
  }

  async deleteById(id: string, session?: ClientSession): Promise<void> {
    await dbConnect();
    const query = Order.deleteOne({ _id: id });
    await (session ? query.session(session) : query);
  }

  /**
   * Dashboard totals, in one round trip.
   *
   * The dashboard used to fetch a thousand whole orders and add them up in the
   * browser, which shipped every customer's contact details to the client and
   * stopped being accurate above a thousand orders.
   */
  async dashboardTotals(windowStart: Date): Promise<DashboardTotals> {
    await dbConnect();

    const [result] = await Order.aggregate([
      {
        $facet: {
          totals: [
            { $match: EARNS_REVENUE },
            { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
          ],
          allCount: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          monthly: [
            { $match: EARNS_REVENUE },
            { $addFields: { effectiveDate: EFFECTIVE_DATE } },
            { $match: { effectiveDate: { $gte: windowStart } } },
            {
              $group: {
                // Grouped by YEAR and month, so the same month in different
                // years no longer collapses into one bar.
                _id: { year: { $year: '$effectiveDate' }, month: { $month: '$effectiveDate' } },
                sales: { $sum: '$totalAmount' },
                orders: { $sum: 1 },
              },
            },
          ],
          recent: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 1,
                orderId: 1,
                status: 1,
                totalAmount: 1,
                createdAt: 1,
                orderDate: 1,
                'customer.name': 1,
              },
            },
          ],
        },
      },
    ]);

    const totals = result?.totals?.[0] ?? { revenue: 0, count: 0 };

    const statusCounts: Record<string, number> = {};
    for (const row of result?.byStatus ?? []) {
      statusCounts[row._id ?? 'unknown'] = row.count;
    }

    return {
      totalOrders: result?.allCount?.[0]?.count ?? 0,
      totalRevenue: totals.revenue ?? 0,
      paidOrders: totals.count ?? 0,
      statusCounts,
      monthlySales: (result?.monthly ?? []).map((row: any) => ({
        year: row._id.year,
        month: row._id.month,
        sales: row.sales ?? 0,
        orders: row.orders ?? 0,
      })),
      recentOrders: result?.recent ?? [],
    };
  }
}

export const orderQueries: OrderQueries = new MongoOrderQueries();
