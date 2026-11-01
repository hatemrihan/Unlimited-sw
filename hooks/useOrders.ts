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

  // No status changes here: order status is tracked on WhatsApp (30 Oct 2026).
  // Deleting an order is what returns its stock.
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
    fetchOrders,
    deleteOrder,
  };
};
