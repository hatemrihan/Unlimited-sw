"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Package, AlertCircle, Info, Loader2, RefreshCw } from 'lucide-react';

interface Notification {
  _id: string;
  type: 'order' | 'stock' | 'system';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string[]>([]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await fetch('/api/admin/notifications?limit=100');
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(prev => [...prev, notificationId]);
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] })
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(prev =>
          prev.map(notif => notif._id === notificationId ? { ...notif, isRead: true } : notif)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setMarkingAsRead(prev => prev.filter(id => id !== notificationId));
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(notif => !notif.isRead).map(notif => notif._id);
    if (unreadIds.length === 0) return;

    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: unreadIds })
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="h-4 w-4 text-green-400" />;
      case 'stock': return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'system': return <Info className="h-4 w-4 text-blue-400" />;
      default: return <Bell className="h-4 w-4 text-white/50" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    if (diffInMinutes < 1440) return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Render stock levels
  const renderStockLevels = (stockLevels: any[]) => {
    if (!stockLevels || stockLevels.length === 0) return null;
    return (
      <div className="mt-2.5 p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-md text-[11px] space-y-1.5">
        <div className="font-medium text-white/40 mb-1">مستويات المخزون:</div>
        {stockLevels.map((stock, index) => (
          <div key={index} className="flex items-center gap-2 text-white/60">
            <span className="truncate flex-1">
              {stock.productName} {stock.variantName ? `(${stock.variantName})` : ''}
            </span>
            <span className={`shrink-0 ${stock.remainingStock < 5 ? 'text-red-400' : 'text-green-400'}`}>
              المتبقي: {stock.remainingStock}
            </span>
            {stock.totalStock !== undefined && (
              <span className="text-white/20 shrink-0">(الكلي: {stock.totalStock})</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-white/20" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <p className="text-[13px] text-white/30">فشل في تحميل الإشعارات</p>
        <button onClick={fetchNotifications} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded text-[12px] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1100px] w-full" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-white leading-none flex items-center gap-2">
            الإشعارات
            {unreadCount > 0 && (
              <span className="bg-white/10 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                {unreadCount}
              </span>
            )}
          </h2>
          <p className="text-[11px] text-white/25 mt-1.5">تحديثات النظام والطلبات</p>
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 bg-white text-black hover:bg-white/90 rounded text-[11px] font-medium transition-colors"
            >
              تحديد الكل كمقروء
            </button>
          )}
          <button onClick={fetchNotifications} className="flex items-center justify-center p-1.5 bg-white/[0.06] border border-white/[0.08] rounded text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="h-10 w-10 text-white/10 mb-4" strokeWidth={1} />
          <p className="text-[13px] text-white/40">لا توجد إشعارات حتى الآن</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`p-4 rounded-lg border transition-all ${
                notification.isRead
                  ? 'bg-white/[0.02] border-white/[0.04]'
                  : 'bg-white/[0.06] border-white/[0.12] shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notification.isRead ? 'bg-white/[0.04]' : 'bg-white/[0.1]'}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-[13px] font-medium truncate ${notification.isRead ? 'text-white/60' : 'text-white'}`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div>
                      )}
                    </div>
                    <p className={`text-[12px] leading-relaxed ${notification.isRead ? 'text-white/40' : 'text-white/70'}`}>
                      {notification.message}
                    </p>

                    {notification.type === 'order' && notification.data?.stockLevels &&
                      renderStockLevels(notification.data.stockLevels)
                    }

                    <div className="mt-2.5 text-[10px] text-white/30 flex items-center gap-1.5">
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {!notification.isRead && (
                  <button
                    onClick={() => markAsRead(notification._id)}
                    disabled={markingAsRead.includes(notification._id)}
                    className="p-1.5 hover:bg-white/[0.1] rounded-md transition-colors disabled:opacity-50 shrink-0 text-white/40 hover:text-white"
                    title="تحديد كمقروء"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
