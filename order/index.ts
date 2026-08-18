/**
 * The public face of the order folder.
 *
 * New code should import from `@/order` and nothing deeper, so the internals
 * stay free to change — which matters here more than anywhere else, because
 * `queries.ts` is the file a Postgres migration replaces.
 */

// ─── Database access (the migration seam) ────────────────────────────────────
export { orderQueries, MongoOrderQueries } from './queries';
export type {
  OrderQueries,
  OrderPage,
  ListOrdersOptions,
  DashboardTotals,
  SortDirection,
} from './queries';

// ─── Shapes ──────────────────────────────────────────────────────────────────
export { default as OrderModel, generateOrderId } from './model';
export type { IOrder, IOrderProduct } from './model';

// ─── Validation ──────────────────────────────────────────────────────────────
export {
  createOrderSchema,
  listOrdersQuerySchema,
  MAX_QUANTITY_PER_LINE,
  MAX_LINES_PER_ORDER,
  MAX_ORDERS_PER_PAGE,
} from './schema';
export type { CreateOrderInput, ListOrdersQuery } from './schema';
