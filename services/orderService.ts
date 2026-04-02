import { orderRepository } from '@/repositories/orderRepository';
import { Order } from '@/hooks/useOrders';
import { logger } from '@/utils/logger';

/**
 * Domain Logic layer for Orders payload standardization.
 */
export const orderService = {
  getOrders: async (signal?: AbortSignal, page = 1, limit = 50): Promise<{orders: Order[], totalPages: number}> => {
    const retryAsync = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
      for (let i = 0; i < retries; i++) {
        try { return await fn(); } 
        catch (error: any) {
          if (i === retries - 1 || error.name === 'AbortError') throw error;
          await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); 
        }
      }
      throw new Error('Retries failed');
    };

    const data = await retryAsync(() => orderRepository.fetchOrders(signal, page, limit));
    return { orders: data.orders || [], totalPages: data.totalPages || 1 };
  },

  updateStatus: async (orderId: string, status: Order['status']): Promise<{success: boolean, message?: string}> => {
    try {
      const data: any = await orderRepository.updateOrderStatus(orderId, status);
      return { success: true, message: data?.message || 'Order status updated successfully' };
    } catch (e: any) {
      logger.error(`[OrderService] Status Update Failed for Order [${orderId}]:`, e);
      return { success: false, message: e.message || 'Failed to update order status' };
    }
  },

  removeOrder: async (orderId: string): Promise<{success: boolean, message?: string}> => {
    try {
      const data: any = await orderRepository.deleteOrder(orderId);
      return { success: !!data.success, message: data?.message || 'Order deleted successfully' };
    } catch (e: any) {
      logger.error(`[OrderService] Deletion Mutation Failed for Order [${orderId}]:`, e);
      return { success: false, message: e.message || 'Failed to delete order' };
    }
  }
};
