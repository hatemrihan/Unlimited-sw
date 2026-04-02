import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { orderService } from '@/services/orderService';
import { handleApiError } from '@/utils/handleApiError';

export interface OrderProduct {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
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

export interface Order {
  _id: string;
  orderId: string;
  customer: Customer;
  products: OrderProduct[];
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  paymentMethod: 'cashOnDelivery' | 'instaPay';
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
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

  // Function to fetch all orders
  const fetchOrders = useCallback(async (signal?: AbortSignal, page = 1, limit = 50) => {
    try {
      setLoadingOrders(true);
      const data = await orderService.getOrders(signal, page, limit);
      setOrders(data.orders);
      setTotalPages(data.totalPages);
    } catch (error: any) {
      // Intentional abort on unmount/navigation — never surface these to the user
      if (error?.name === 'AbortError') return;
      handleApiError(error, 'Failed to fetch orders');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Function to update order status
  const updateOrderStatus = useCallback(async (orderId: string, newStatus: Order['status']) => {
    try {
      const res = await orderService.updateStatus(orderId, newStatus);
      
      if (res.success) {
        setOrders(prev => prev.map(order =>
          order._id === orderId ? { ...order, status: newStatus } : order
        ));
        toast.success(res.message);
        return true;
      } else {
        toast.error(res.message);
        return false;
      }
    } catch (error) {
      handleApiError(error, 'Error updating order status');
      return false;
    }
  }, []);

  // Function to delete order
  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      const res = await orderService.removeOrder(orderId);
      
      if (res.success) {
        setOrders(prev => prev.filter(order => order._id !== orderId));
        toast.success(res.message);
        return true;
      } else {
        toast.error(res.message);
        return false;
      }
    } catch (error) {
      handleApiError(error, 'Error deleting order');
      return false;
    }
  }, []);

  return {
    orders,
    loadingOrders,
    totalPages,
    fetchOrders,
    updateOrderStatus,
    deleteOrder,
  };
};
