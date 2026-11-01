import { orderRepository, OrderApiError, FetchOrdersParams } from '@/repositories/orderRepository';
import { Order } from '@/hooks/useOrders';
import { logger } from '@/utils/logger';

export interface OrderListResult {
  orders: Order[];
  totalPages: number;
  totalCount: number;
}

export interface OrderMutationResult {
  success: boolean;
  message?: string;
  /** True when the server reported a 409 — something moved, not something broke. */
  isConflict?: boolean;
}

/**
 * Domain Logic layer for Orders payload standardization.
 */
export const orderService = {
  getOrders: async (signal?: AbortSignal, params: FetchOrdersParams = {}): Promise<OrderListResult> => {
    const retryAsync = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
      for (let i = 0; i < retries; i++) {
        try { return await fn(); }
        catch (error: any) {
          // A 4xx is a considered answer, not a blip — retrying it just delays
          // the message the admin needs to read.
          if (i === retries - 1 || error.name === 'AbortError') throw error;
          if (error instanceof OrderApiError && error.status < 500) throw error;
          await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
        }
      }
      throw new Error('Retries failed');
    };

    const data = await retryAsync(() => orderRepository.fetchOrders(signal, params));
    return {
      orders: data.orders || [],
      totalPages: data.totalPages || 1,
      totalCount: data.totalCount || 0,
    };
  },

  removeOrder: async (orderId: string): Promise<OrderMutationResult> => {
    try {
      const data: any = await orderRepository.deleteOrder(orderId);
      return { success: !!data.success, message: data?.message || 'Order deleted' };
    } catch (e: any) {
      logger.error(`[OrderService] Deletion Mutation Failed for Order [${orderId}]:`, e);
      return {
        success: false,
        message: e?.message || 'Failed to delete order',
        isConflict: e instanceof OrderApiError && e.isConflict,
      };
    }
  }
};
