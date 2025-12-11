"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Package, AlertCircle, Info } from 'lucide-react';

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

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<string[]>([]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/notifications?limit=100');
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
      } else {
        console.error('Failed to fetch notifications:', data.error);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(prev => [...prev, notificationId]);

      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: [notificationId]
        })
      });

      const data = await response.json();

      if (data.success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId
              ? { ...notif, isRead: true }
              : notif
          )
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
    const unreadIds = notifications
      .filter(notif => !notif.isRead)
      .map(notif => notif._id);

    if (unreadIds.length === 0) return;

    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: unreadIds
        })
      });

      const data = await response.json();

      if (data.success) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true }))
        );
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="h-5 w-5 text-green-500" />;
      case 'stock':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'system':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Render stock levels
  const renderStockLevels = (stockLevels: any[]) => {
    if (!stockLevels || stockLevels.length === 0) return null;

    return (
      <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
        <div className="font-medium text-gray-600 mb-1">Stock Levels:</div>
        {stockLevels.map((stock, index) => (
          <div key={index} className="text-gray-500">
            {stock.productName}
            {stock.variantName && ` (${stock.variantName})`}:
            <span className={`ml-1 ${stock.remainingStock < 5 ? 'text-red-600' : 'text-green-600'}`}>
              {stock.remainingStock} remaining
            </span>
            {stock.totalStock && (
              <span className="text-gray-400 ml-1">
                (Total: {stock.totalStock})
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    fetchNotifications();

    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 p-4 rounded-lg animate-pulse shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-sm px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-10">
          <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`p-4 rounded-lg border transition-all shadow-sm ${notification.isRead
                  ? 'bg-white border-gray-200'
                  : 'bg-blue-50 border-blue-200'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className={`font-medium ${notification.isRead ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className={`mt-1 text-sm ${notification.isRead ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                      {notification.message}
                    </p>

                    {/* Render stock levels for order notifications */}
                    {notification.type === 'order' && notification.data?.stockLevels &&
                      renderStockLevels(notification.data.stockLevels)
                    }

                    <div className="mt-2 text-xs text-gray-500">
                      {formatDate(notification.createdAt)}
                    </div>
                  </div>
                </div>

                {!notification.isRead && (
                  <button
                    onClick={() => markAsRead(notification._id)}
                    disabled={markingAsRead.includes(notification._id)}
                    className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;






