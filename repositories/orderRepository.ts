import { fetchWithRetry } from '@/utils/fetchWithRetry';
import { z } from 'zod';

const OrdersResponseSchema = z.object({
  orders: z.array(z.any()).default([]),
  totalPages: z.number().default(1),
}).passthrough();

const OrderActionSchema = z.object({
  success: z.boolean().default(true),
  message: z.string().optional(),
}).passthrough();

/**
 * Pure HTTP transport layer for Orders domain.
 */
export const orderRepository = {
  fetchOrders: async (signal?: AbortSignal, page = 1, limit = 50) => {
    const response = await fetchWithRetry(`/api/orders?page=${page}&limit=${limit}`, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch orders: HTTP ${response.status}`);
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
      throw new Error(`Failed to update order: HTTP ${response.status}`);
    }
    const data = await response.json();
    return OrderActionSchema.parse(data);
  },

  deleteOrder: async (orderId: string) => {
    const response = await fetchWithRetry(`/api/orders/${orderId}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Failed to delete order: HTTP ${response.status}`);
    }
    const data = await response.json();
    return OrderActionSchema.parse(data);
  }
};
