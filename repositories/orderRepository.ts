import { fetchWithRetry } from '@/utils/fetchWithRetry';
import { z } from 'zod';

const OrdersResponseSchema = z.object({
  orders: z.array(z.any()).default([]),
  totalPages: z.number().default(1),
  totalCount: z.number().default(0),
}).passthrough();

const OrderActionSchema = z.object({
  success: z.boolean().default(true),
  message: z.string().optional(),
}).passthrough();

/**
 * Raised when the API refuses a request, carrying what the API actually said.
 *
 * Every method here used to throw `new Error(\`… HTTP ${status}\`)` without ever
 * reading the response body, which silently deleted every error message the API
 * takes care to produce. The 409 from `PATCH /api/orders/[id]` exists
 * specifically to tell the admin "inventory moved on, reload" rather than
 * "something broke" — and it reached them as `Failed to update order: HTTP 409`.
 */
export class OrderApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** True when the server reported a conflict the admin can act on (409). */
    public readonly isConflict: boolean
  ) {
    super(message);
    this.name = 'OrderApiError';
  }
}

/**
 * Turns a failed response into an error that still carries the server's wording.
 * Falls back to a plain sentence per status code when there is no usable body —
 * never a bare "HTTP 500", which tells the admin nothing they can act on.
 */
async function toApiError(response: Response, fallback: string): Promise<OrderApiError> {
  let message = '';

  try {
    const body = await response.json();
    message = body?.error || body?.message || '';
  } catch {
    // Empty or non-JSON body — fall through to the status-based wording.
  }

  if (!message) {
    if (response.status === 404) message = 'That order no longer exists. Refresh the list.';
    else if (response.status === 401 || response.status === 403) message = 'Your session has expired. Sign in again.';
    else if (response.status >= 500) message = 'The server had a problem. Try again in a moment.';
    else message = fallback;
  }

  return new OrderApiError(message, response.status, response.status === 409);
}

export interface FetchOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/**
 * Pure HTTP transport layer for Orders domain.
 */
export const orderRepository = {
  fetchOrders: async (signal?: AbortSignal, params: FetchOrdersParams = {}) => {
    // Search, status and sort are sent to the SERVER. They used to be applied in
    // the browser over the 50 rows already on screen, so searching for a
    // customer on page 3 confidently reported "no orders match".
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 1));
    query.set('limit', String(params.limit ?? 50));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortDir) query.set('sortDir', params.sortDir);

    const response = await fetchWithRetry(`/api/orders?${query.toString()}`, { signal });
    if (!response.ok) {
      throw await toApiError(response, 'Could not load orders.');
    }
    const data = await response.json();
    return OrdersResponseSchema.parse(data);
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const response = await fetchWithRetry(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw await toApiError(response, 'Could not update this order.');
    }
    const data = await response.json();
    return OrderActionSchema.parse(data);
  },

  deleteOrder: async (orderId: string) => {
    const response = await fetchWithRetry(`/api/orders/${orderId}`, { method: 'DELETE' });
    if (!response.ok) {
      throw await toApiError(response, 'Could not delete this order.');
    }
    const data = await response.json();
    return OrderActionSchema.parse(data);
  }
};
