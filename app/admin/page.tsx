"use client";

import React, { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import LightRays from '../../components/LightRays';
import ProtectedAdminRoute from '@/components/auth/protected-admin-route';
import SidebarNav from './sections/SideBarNav';
import Orders from './sections/orders';
import Products from './sections/products';
import PromoCodes from './sections/promoCodes';
import Intro from './sections/intro';
import Reviews from './sections/reviews';
import { useSession } from 'next-auth/react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


const AdminDashboard = () => {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState({
    products: 0,
    orders: 0,
    promoCodes: 0
  });
  const [chartData, setChartData] = useState<Array<{date: string, orders: number, revenue: number}>>([]);
  const [monthlyData, setMonthlyData] = useState<Array<{name: string, sales: number}>>([
    { name: 'Jan', sales: 0 }, { name: 'Feb', sales: 0 }, { name: 'Mar', sales: 0 },
    { name: 'Apr', sales: 0 }, { name: 'May', sales: 0 }, { name: 'Jun', sales: 0 },
    { name: 'Jul', sales: 0 }, { name: 'Aug', sales: 0 }, { name: 'Sep', sales: 0 },
    { name: 'Oct', sales: 0 }, { name: 'Nov', sales: 0 }, { name: 'Dec', sales: 0 }
  ]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [recentAthletes, setRecentAthletes] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Visit store function
  const handleVisitStore = () => {
    if (typeof window !== 'undefined') {
      window.open('/', '_blank');
    }
  };

  // Function to process orders for chart data
  const processOrdersForChart = (orders: any[]) => {
    const last7Days: Array<{date: string, orders: number, revenue: number}> = [];
    const today = new Date();
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      last7Days.push({
        date: dayName,
        orders: 0,
        revenue: 0
      });
    }
    
    // Count orders and revenue for each day
    if (orders && orders.length > 0) {
      orders.forEach((order: any) => {
        try {
          const orderDate = new Date(order.orderDate || order.createdAt);
          if (!isNaN(orderDate.getTime())) {
            const today = new Date();
            const daysDiff = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff >= 0 && daysDiff <= 6) {
              const dayIndex = 6 - daysDiff;
              if (last7Days[dayIndex]) {
                last7Days[dayIndex].orders += 1;
                last7Days[dayIndex].revenue += order.totalAmount || order.total || 0;
              }
            }
          }
        } catch (error) {
          console.error('Error processing order for chart:', error);
        }
      });
    }
    
    return last7Days;
  };

  // Function to process monthly data
  const processMonthlyData = (orders: any[]) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const monthlySales = months.map(month => ({ name: month, sales: 0 }));
    
    if (orders && orders.length > 0) {
      orders.forEach((order: any) => {
        try {
          const orderDate = new Date(order.orderDate || order.createdAt);
          if (!isNaN(orderDate.getTime())) {
            const monthIndex = orderDate.getMonth();
            if (monthIndex >= 0 && monthIndex < 12) {
              monthlySales[monthIndex].sales += order.totalAmount || order.total || 0;
            }
          }
        } catch (error) {
          console.error('Error processing order date:', error);
        }
      });
    }
    
    return monthlySales;
  };

  // Function to fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true);
      
      // Fetch all data in parallel
      const [productsResponse, ordersResponse, promoCodesResponse] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/orders'),
        fetch('/api/promo')
      ]);

      const stats = {
        products: 0,
        orders: 0,
        promoCodes: 0
      };

      // Get products count
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        stats.products = productsData.products?.length || 0;
        
        // Get recent products
        const recentProductsData = productsData.products?.slice(0, 5).map((product: any) => {
          // Properly format the date
          let formattedDate = 'Unknown';
          try {
            if (product.createdAt) {
              const date = new Date(product.createdAt);
              if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
              }
            }
          } catch (error) {
            console.error('Error formatting product date:', error);
          }

          return {
            _id: product._id || 'Unknown',
            name: product.name || 'Unknown Product',
            price: product.price || 0,
            isFeatured: product.isFeatured || false,
            createdAt: formattedDate
          };
        }) || [];
        
        setRecentProducts(recentProductsData);
      }

      // Get orders count and chart data
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        console.log('Orders data received:', ordersData);
        stats.orders = ordersData.orders?.length || 0;
        
        // Process orders for chart data (last 7 days)
        const orders = ordersData.orders || [];
        console.log('Processing orders:', orders.length);
        const chartData = processOrdersForChart(orders);
        const monthlyData = processMonthlyData(orders);
        const recentOrdersData = orders.slice(0, 5).map((order: any) => {
          // Properly format the date
          let formattedDate = 'Unknown';
          try {
            const dateValue = order.createdAt || order.orderDate;
            if (dateValue) {
              const date = new Date(dateValue);
              if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
              }
            }
          } catch (error) {
            console.error('Error formatting order date:', error);
          }

          return {
            _id: order._id || order.orderId || 'Unknown',
            customerName: order.customer?.name || order.customerName || 'Unknown',
            status: order.status || 'pending',
            createdAt: formattedDate,
            total: order.totalAmount || order.total || 0
          };
        });
        
        console.log('Chart data:', chartData);
        console.log('Monthly data:', monthlyData);
        console.log('Recent orders:', recentOrdersData);
        
        setChartData(chartData);
        setMonthlyData(monthlyData);
        setRecentOrders(recentOrdersData);
      }

      // Get promo codes count
      if (promoCodesResponse.ok) {
        const promoCodesData = await promoCodesResponse.json();
        stats.promoCodes = promoCodesData.promoCodes?.length || 0;
      }

      // Get recent athletes
      try {
        const athletesResponse = await fetch('/api/admin/intro');
        if (athletesResponse.ok) {
          const athletesData = await athletesResponse.json();
          const recentAthletesData = (athletesData.items || []).slice(0, 5).map((athlete: any) => {
            // Properly format the date
            let formattedDate = 'Unknown';
            try {
              if (athlete.createdAt) {
                const date = new Date(athlete.createdAt);
                if (!isNaN(date.getTime())) {
                  formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                }
              }
            } catch (error) {
              console.error('Error formatting athlete date:', error);
            }

            return {
              _id: athlete._id || 'Unknown',
              title: athlete.title || 'Untitled',
              isActive: athlete.isActive || false,
              createdAt: formattedDate
            };
          });
          setRecentAthletes(recentAthletesData);
        }
      } catch (error) {
        console.error('Error fetching recent athletes:', error);
      }

      // Get recent reviews
      try {
        const reviewsResponse = await fetch('/api/admin/feedback');
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          const recentReviewsData = (reviewsData.feedback || []).slice(0, 5).map((review: any) => {
            // Properly format the date
            let formattedDate = 'Unknown';
            try {
              if (review.createdAt) {
                const date = new Date(review.createdAt);
                if (!isNaN(date.getTime())) {
                  formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                }
              }
            } catch (error) {
              console.error('Error formatting review date:', error);
            }

            return {
              _id: review._id || 'Unknown',
              rating: review.rating || 0,
              isApproved: review.isApproved || false,
              message: review.message || '',
              createdAt: formattedDate
            };
          });
          setRecentReviews(recentReviewsData);
        }
      } catch (error) {
        console.error('Error fetching recent reviews:', error);
      }

      setDashboardStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch stats when component mounts
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Refresh stats when returning to dashboard
  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeSection]);

  // Render dashboard content
  const renderDashboardContent = () => (
    <div className="space-y-8">
      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {/* Products Card */}
        <div className="bg-black shadow-sm hover:shadow-md transition-shadow border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white mb-1">Products</h3>
              <div className="text-2xl font-bold text-white">
                {loadingStats ? (
                  <div className="animate-pulse bg-gray-700 h-8 w-12 rounded"></div>
                ) : (
                  dashboardStats.products
                )}
            </div>
            </div>
            <div className="p-2 rounded-full bg-white/10">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('products')}
            className="text-sm text-white hover:text-white/70 mt-2 inline-flex items-center"
          >
            Manage Products
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </button>
        </div>

        {/* Orders Card */}
        <div className="bg-black shadow-sm hover:shadow-md transition-shadow border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white mb-1">Orders</h3>
              <div className="text-2xl font-bold text-white">
                {loadingStats ? (
                  <div className="animate-pulse bg-gray-700 h-8 w-12 rounded"></div>
                ) : (
                  dashboardStats.orders
                )}
            </div>
            </div>
            <div className="p-2 rounded-full bg-white/10">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('orders')}
            className="text-sm text-white hover:text-white/70 mt-2 inline-flex items-center"
          >
            View Orders
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </button>
        </div>

        {/* Promo Codes Card */}
        <div className="bg-black shadow-sm hover:shadow-md transition-shadow border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between">
        <div>
              <h3 className="text-sm font-medium text-white mb-1">Promo Codes</h3>
              <div className="text-2xl font-bold text-white">
                {loadingStats ? (
                  <div className="animate-pulse bg-gray-700 h-8 w-12 rounded"></div>
                ) : (
                  dashboardStats.promoCodes
                  )}
                </div>
                  </div>
            <div className="p-2 rounded-full bg-white/10">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
        </div>
                    <button
            onClick={() => setActiveSection('promo')}
            className="text-sm text-white hover:text-white/70 mt-2 inline-flex items-center"
          >
            Manage Promo Codes
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
                  </button>
                </div>
              </div>

   

      {/* Monthly Sales Overview */}
      <Card className="bg-black border-white/10">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Monthly Sales Overview</CardTitle>
          <CardDescription className="text-gray-300">Sales performance for all months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255,255,255,0.1)" 
                />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.7)" 
                  tick={{ fill: 'rgba(255,255,255,0.7)' }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.7)" 
                  tick={{ fill: 'rgba(255,255,255,0.7)' }}
                />
                <Tooltip 
                  formatter={(value) => [`L.E ${Number(value).toLocaleString()}`, 'Sales']} 
                  contentStyle={{
                    backgroundColor: '#000',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    padding: '8px'
                  }}
                  itemStyle={{
                    color: '#fff',
                  }}
                  labelStyle={{
                    color: '#fff',
                    fontWeight: 'bold'
                  }}
                />
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#ffffff"
                  strokeWidth={2}
                  fill="url(#colorSales)" 
                  fillOpacity={1} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 border-t border-white/10">
            <div className="grid grid-cols-4 gap-2 text-xs">
              {monthlyData.map((month, index) => (
                <div key={index} className="flex flex-col items-center">
                  <span className="font-medium text-white">{month.name}</span>
                  <span className="text-gray-300">L.E {month.sales.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders Table */}
      <Card className="bg-black border-white/10">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Recent Orders</CardTitle>
          <CardDescription className="text-gray-300">Latest orders across your store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2 text-left font-medium text-white">Order ID</th>
                  <th className="px-4 py-2 text-left font-medium text-white">Customer</th>
                  <th className="px-4 py-2 text-left font-medium text-white">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-white">Date</th>
                  <th className="px-4 py-2 text-right font-medium text-white">Amount</th>
                  <th className="px-4 py-2 text-right font-medium text-white"></th>
                </tr>
              </thead>
              <tbody>
                {recentOrders && recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr key={order._id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-4 py-2 text-white">{order._id && order._id.length > 6 ? order._id.slice(-6) : order._id}</td>
                      <td className="px-4 py-2 text-white">{order.customerName}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status === 'pending' ? 'bg-yellow-600 text-white' :
                          order.status === 'confirmed' ? 'bg-blue-600 text-white' :
                          order.status === 'shipped' ? 'bg-purple-600 text-white' :
                          order.status === 'delivered' ? 'bg-green-600 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-300">{order.createdAt}</td>
                      <td className="px-4 py-2 text-right font-medium text-white">L.E {order.total.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActiveSection('orders')}
                            className="text-white hover:text-gray-300"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                      No recent orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {recentOrders.length > 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setActiveSection('orders')}
                className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center"
              >
                View All Orders
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Products Table */}
      <Card className="bg-black border-white/10">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Recent Products</CardTitle>
          <CardDescription className="text-gray-300">Latest products added to your store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2 text-left font-medium text-white">Product Name</th>
                  <th className="px-4 py-2 text-left font-medium text-white">Price</th>
                  <th className="px-4 py-2 text-left font-medium text-white">Featured</th>
                  <th className="px-4 py-2 text-left font-medium text-white">Date Added</th>
                  <th className="px-4 py-2 text-right font-medium text-white"></th>
                </tr>
              </thead>
              <tbody>
                {recentProducts && recentProducts.length > 0 ? (
                  recentProducts.map((product) => (
                    <tr key={product._id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-4 py-2 text-white">{product.name}</td>
                      <td className="px-4 py-2 text-white">L.E {product.price?.toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.isFeatured ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                        }`}>
                          {product.isFeatured ? 'Featured' : 'Regular'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-300">{product.createdAt}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActiveSection('products')}
                            className="text-white hover:text-gray-300"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                      No recent products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {recentProducts.length > 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setActiveSection('products')}
                className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center"
              >
                View All Products
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Athletes Table */}
      <Card className="bg-black border-white/10 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-white">Recent Athletes</CardTitle>
          <CardDescription className="text-gray-400 text-sm">Latest athletes added to your platform</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-black/20">
                  <th className="px-6 py-4 text-left font-semibold text-white text-sm uppercase tracking-wider">Athlete Name</th>
                  <th className="px-6 py-4 text-left font-semibold text-white text-sm uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left font-semibold text-white text-sm uppercase tracking-wider">Date Added</th>
                  <th className="px-6 py-4 text-right font-semibold text-white text-sm uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {recentAthletes && recentAthletes.length > 0 ? (
                  recentAthletes.map((athlete) => (
                    <tr key={athlete._id} className="hover:bg-white/5 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{athlete.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          athlete.isActive 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {athlete.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{athlete.createdAt}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setActiveSection('intro')}
                          className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors duration-150"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-lg font-medium text-gray-400">No recent athletes found</p>
                        <p className="text-sm text-gray-500 mt-1">Athletes will appear here once added to your platform</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {recentAthletes.length > 0 && (
            <div className="px-6 py-4 border-t border-white/10 bg-black/20">
              <button
                onClick={() => setActiveSection('intro')}
                className="text-blue-400 hover:text-blue-300 font-medium text-sm inline-flex items-center transition-colors duration-150"
              >
                View All Athletes
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Reviews Table */}
      <Card className="bg-black border-white/10 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-white">Recent Reviews</CardTitle>
          <CardDescription className="text-gray-400 text-sm">Latest customer reviews</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-black/20">
                  <th className="px-6 py-4 text-left font-semibold text-white text-sm uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-4 text-left font-semibold text-white text-sm uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right font-semibold text-white text-sm uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {recentReviews && recentReviews.length > 0 ? (
                  recentReviews.map((review) => (
                    <tr key={review._id} className="hover:bg-white/5 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
                                }`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-sm text-gray-400 font-medium">({review.rating}/5)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{review.createdAt}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setActiveSection('reviews')}
                          className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors duration-150"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.98L3 20l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" />
                        </svg>
                        <p className="text-lg font-medium text-gray-400">No recent reviews found</p>
                        <p className="text-sm text-gray-500 mt-1">Customer reviews will appear here once submitted</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {recentReviews.length > 0 && (
            <div className="px-6 py-4 border-t border-white/10 bg-black/20">
              <button
                onClick={() => setActiveSection('reviews')}
                className="text-blue-400 hover:text-blue-300 font-medium text-sm inline-flex items-center transition-colors duration-150"
              >
                View All Reviews
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ProtectedAdminRoute>
      <div className="flex min-h-screen flex-col relative bg-black">
        {/* LightRays Background */}
        <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <LightRays
            raysOrigin="top-center"
            raysColor="#00ffff"
            raysSpeed={1.5}
            lightSpread={0.8}
            rayLength={1.2}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
            className="custom-rays"
          />
                                </div>
        
        <main className="flex-1 p-3 md:p-6 lg:p-8 pb-20 lg:pb-8 overflow-x-hidden bg-transparent relative z-10 md:ml-64">
          <div className="max-w-7xl mx-auto">
            {/* Dashboard heading */}
        <div className="mb-8">
          <a href="/admin">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight font-bold text-center sm:text-left text-white cursor-pointer">
                UNLIMITED-SW Dashboard
              </h1>
              </a>
              <div className="h-1 w-24 sm:w-32 md:w-40 bg-white mt-2 mx-auto sm:mx-0"></div>
        </div>

            {/* Sidebar Navigation */}
            <SidebarNav
              logo="/images/Logo-image.png"
              logoAlt="Alkady Logo"
              items={[
                { 
                  label: 'Dashboard', 
                  href: '#dashboard', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ), 
                  onClick: () => setActiveSection('dashboard') 
                },
                { 
                  label: 'OUR ATHLETES', 
                  href: '#intro', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ), 
                  onClick: () => setActiveSection('intro') 
                },
                { 
                  label: 'Reviews', 
                  href: '#reviews', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  ), 
                  onClick: () => setActiveSection('reviews') 
                },
                { 
                  label: 'Products', 
                  href: '#products', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  ), 
                  onClick: () => setActiveSection('products') 
                },
                { 
                  label: 'Promo Codes', 
                  href: '#promo', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  ), 
                  onClick: () => setActiveSection('promo') 
                },
                { 
                  label: 'Orders', 
                  href: '#orders', 
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  ), 
                  onClick: () => setActiveSection('orders') 
                },

              ]}
              activeHref={`#${activeSection}`}
              className="custom-nav"
              ease="power2.easeOut"
              baseColor="#000000"
              pillColor="#ffffff"
              hoveredPillTextColor="#ffffff"
              pillTextColor="#000000"
                          onMobileMenuClick={() => {}}
            userName={session?.user?.name || "Admin"}
            onVisitStore={handleVisitStore}
            />

            {/* Content based on active section */}
            {activeSection === 'dashboard' && renderDashboardContent()}
            {activeSection === 'intro' && <Intro />}
            {activeSection === 'reviews' && <Reviews />}
            {activeSection === 'products' && <Products />}
            {activeSection === 'promo' && <PromoCodes />}
            {activeSection === 'orders' && <Orders />}


          </div>
        </main>
      </div>
    </ProtectedAdminRoute>
  );
};

export default AdminDashboard;