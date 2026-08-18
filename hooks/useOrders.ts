import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { orderService } from '@/services/orderService';
import { FetchOrdersParams } from '@/repositories/orderRepository';
import { handleApiError } from '@/utils/handleApiError';

export interface OrderProduct {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variantName?: string;
  size?: string;
  color?: string;
  promoCode?: string;
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  _id: string;
  orderId: string;
  customer: Customer;
  products: OrderProduct[];
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  codFee?: number;
  paymentMethod: 'cashOnDelivery' | 'instaPay';
  status: OrderStatus;
  orderDate: string;
  createdAt: string;
  transactionScreenshot?: string;
  promoCode?: string;
  discountAmount?: number;
  notes?: string;
}

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  /** The order currently being updated, so the row can show its own spinner. */
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async (signal?: AbortSignal, params: FetchOrdersParams = {}) => {
    try {
      setLoadingOrders(true);
      const data = await orderService.getOrders(signal, params);
      setOrders(data.orders);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (error: any) {
      // Intentional abort on unmount/navigation — never surface these to the user
      if (error?.name === 'AbortError') return;
      handleApiError(error, 'Failed to fetch orders');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  /**
   * Moves an order to a new status.
   *
   * Returns whether it worked, and — when it did not — whether the reason was a
   * conflict. A conflict means the server refused because the world moved on
   * (stock was sold, a promo code filled up), so the caller reloads to show the
   * admin what is actually true rather than leaving a stale row on screen.
   */
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await orderService.updateStatus(orderId, newStatus);

      if (res.success) {
        setOrders(prev => prev.map(order =>
          order._id === orderId ? { ...order, status: newStatus } : order
        ));
        toast.success(res.message);
        return { ok: true as const, isConflict: false };
      }

      // The server's own wording reaches the admin here — "stock changed since
      // this page was loaded", "that promo code is fully used" — instead of the
      // `HTTP 409` this layer used to report.
      toast.error(res.message, { duration: res.isConflict ? 8000 : 5000 });
      return { ok: false as const, isConflict: Boolean(res.isConflict) };
    } catch (error) {
      handleApiError(error, 'Error updating order status');
      return { ok: false as const, isConflict: false };
    } finally {
      setUpdatingOrderId(null);
    }
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      const res = await orderService.removeOrder(orderId);

      if (res.success) {
        setOrders(prev => prev.filter(order => order._id !== orderId));
        setTotalCount(prev => Math.max(0, prev - 1));
        toast.success(res.message);
        return true;
      }

      toast.error(res.message);
      return false;
    } catch (error) {
      handleApiError(error, 'Error deleting order');
      return false;
    }
  }, []);

  return {
    orders,
    loadingOrders,
    totalPages,
    totalCount,
    updatingOrderId,
    fetchOrders,
    updateOrderStatus,
    deleteOrder,
  };
};
