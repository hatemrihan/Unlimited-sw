"use client";

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Package, ShoppingCart, Tag, Users, Star,
  TrendingUp, TrendingDown, ArrowUpRight,
  Loader2, RefreshCw,
} from 'lucide-react';
import ProtectedAdminRoute from '@/components/auth/protected-admin-route';
import SidebarNav from './sections/SideBarNav';
import Orders from './sections/orders';
import Products from './sections/products';
import PromoCodes from './sections/promoCodes';
import Reviews from './sections/reviews';
import Notifications from './sections/notifications';
import Contacts from './sections/contacts';
import PaymentSettings from './sections/paymentSettings';
import Funnel from './sections/funnel';
import Cities from './sections/cities';
import { useSession } from 'next-auth/react';

// ── Types ─────────────────────────────────────────────────────

interface RecentOrder { _id: string; customerName: string; status: string; createdAt: string; total: number; }
interface RecentProduct { _id: string; name: string; price: number; createdAt: string; }
interface RecentReview { _id: string; rating: number; isApproved: boolean; message: string; createdAt: string; }

// ── Helpers ───────────────────────────────────────────────────

function formatEGP(val: number) { return `${val.toLocaleString('en-EG')} ج.م`; }

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'غير معروف';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'غير معروف';
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return 'غير معروف'; }
}

function statusColor(s: string) {
  const m: Record<string, string> = {
    delivered: 'text-green-400 bg-green-400/10', shipped: 'text-blue-400 bg-blue-400/10',
    confirmed: 'text-amber-400 bg-amber-400/10', cancelled: 'text-red-400 bg-red-400/10',
    pending: 'text-orange-400 bg-orange-400/10',
  };
  return m[s.toLowerCase()] || 'text-white/40 bg-white/[0.04]';
}

function statusAr(s: string) {
  const m: Record<string, string> = {
    pending: 'قيد الانتظار', confirmed: 'مؤكد', shipped: 'تم الشحن',
    delivered: 'تم التوصيل', cancelled: 'ملغي',
  };
  return m[s.toLowerCase()] || s;
}

// ── Mini Bar Chart ────────────────────────────────────────────
const MiniBarChart = memo(({ data, height = 120 }: { data: { label: string; value: number }[]; height?: number }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-[3px] overflow-visible" style={{ height }} dir="ltr">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col justify-end items-center gap-1 group relative h-full">
          <div className="w-full rounded-t bg-white/[0.15] group-hover:bg-white/30 transition-all duration-200 min-h-[2px]"
            style={{ height: `${(d.value / max) * 100}%` }} />
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-10 shadow-lg">
            {d.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
});
MiniBarChart.displayName = 'MiniBarChart';

// ── KPI Card ──────────────────────────────────────────────────
const KPICard = memo(({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; onClick?: () => void;
}) => (
  <div onClick={onClick} className={`bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 group hover:border-white/[0.12] transition-colors ${onClick ? 'cursor-pointer' : ''}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
    </div>
    <div className="text-xl font-semibold text-white tracking-tight leading-none">{value}</div>
    <div className="text-[11px] text-white/35 mt-1.5">{label}</div>
    {sub && <div className="text-[10px] text-white/20 mt-0.5">{sub}</div>}
  </div>
));
KPICard.displayName = 'KPICard';

// ── Dashboard Content ─────────────────────────────────────────
const DashboardContent = memo(({ onNavigate }: { onNavigate: (s: string) => void }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState({ products: 0, orders: 0, promoCodes: 0 });
  const [monthlyData, setMonthlyData] = useState<{ name: string; sales: number }[]>([]);
  /** All-time revenue, excluding cancelled orders. Summed by MongoDB, not here. */
  const [revenue, setRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(false);
      const [prodRes, ordRes, promoRes] = await Promise.all([
        // Totals come pre-computed from the database. This used to pull 1,000
        // whole orders — every customer's name, email, phone and address — just
        // to add up four numbers in the browser, and quietly stopped being
        // accurate above 1,000 orders.
        fetch('/api/admin/products?limit=5'), fetch('/api/admin/orders/stats'), fetch('/api/promo'),
      ]);
      const s = { products: 0, orders: 0, promoCodes: 0 };

      if (prodRes.ok) {
        const d = await prodRes.json();
        s.products = d.pagination?.total || d.products?.length || 0;
        setRecentProducts((d.products || []).slice(0, 5).map((p: any) => ({
          _id: p._id || '', name: p.name || '', price: p.price || 0,
          createdAt: formatDate(p.createdAt),
        })));
      }

      if (ordRes.ok) {
        const d = await ordRes.json();
        s.orders = d.totalOrders || 0;
        // Already summed per year+month by MongoDB, and already covering every
        // order rather than the most recent thousand.
        setMonthlyData((d.monthly || []).map((m: any) => ({ name: m.name, sales: m.sales || 0 })));
        setRevenue(Number(d.totalRevenue) || 0);
        setRecentOrders((d.recentOrders || []).map((o: any) => ({
          _id: o._id || o.orderId || '', customerName: o.customerName || 'غير معروف',
          status: o.status || 'pending', createdAt: formatDate(o.createdAt),
          total: Number(o.total) || 0,
        })));
      }

      if (promoRes.ok) { const d = await promoRes.json(); s.promoCodes = d.promoCodes?.length || 0; }

      try { const r = await fetch('/api/admin/feedback'); if (r.ok) { const d = await r.json(); setRecentReviews((d.feedback || []).slice(0, 5).map((rv: any) => ({ _id: rv._id || '', rating: rv.rating || 0, isApproved: rv.isApproved || false, message: rv.message || '', createdAt: formatDate(rv.createdAt) }))); } } catch { /* skip */ }

      setStats(s);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-5 w-5 animate-spin text-white/20" /></div>;

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <p className="text-[13px] text-white/30">فشل في تحميل البيانات</p>
      <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded text-[12px] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors">
        <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
      </button>
    </div>
  );

  // The server's own total, over every order — not the sum of the 12-month chart.
  const totalRevenue = revenue;

  return (
    <div className="space-y-6 max-w-[1100px]" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-white leading-none">لوحة التحكم</h2>
          <p className="text-[11px] text-white/25 mt-1.5">أداء المتجر في الوقت الفعلي</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded text-[11px] text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors">
          <RefreshCw className="h-3 w-3" /> تحديث
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={ShoppingCart} label="الإيرادات" value={formatEGP(totalRevenue)} sub="من الطلبات" color="#4ade80" onClick={() => onNavigate('orders')} />
        <KPICard icon={Package} label="الطلبات" value={stats.orders.toString()} sub="إجمالي الطلبات" color="#60a5fa" onClick={() => onNavigate('orders')} />
        <KPICard icon={Tag} label="المنتجات" value={stats.products.toString()} sub="في المتجر" color="#fbbf24" onClick={() => onNavigate('products')} />
        <KPICard icon={Users} label="أكواد الخصم" value={stats.promoCodes.toString()} sub="أكواد فعالة" color="#c084fc" onClick={() => onNavigate('promo')} />
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">المبيعات الشهرية</span>
          <span className="text-[10px] text-white/20">{monthlyData.length} شهر</span>
        </div>
        {monthlyData.some(m => m.sales > 0) ? (
          <>
            <MiniBarChart data={monthlyData.map(d => ({ label: d.name, value: d.sales }))} height={110} />
            <div className="flex justify-between mt-2.5" dir="ltr">
              {monthlyData.map(d => <span key={d.name} className="text-[7px] text-white/15 flex-1 text-center">{d.name}</span>)}
            </div>
          </>
        ) : (
          <div className="h-[110px] flex flex-col items-center justify-center text-[12px] text-white/15">
            لا توجد بيانات مبيعات بعد
          </div>
        )}
      </div>

      {/* Recent Orders + Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Orders */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">أحدث الطلبات</span>
            <button onClick={() => onNavigate('orders')} className="text-[10px] text-white/25 hover:text-white/50 transition-colors">عرض الكل ←</button>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-1.5">
              {recentOrders.map(o => (
                <div key={o._id} className="flex items-center gap-3 py-2 px-2.5 rounded-md hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-white block truncate">{o.customerName}</span>
                    <span className="text-[10px] text-white/20 block">{o.createdAt}</span>
                  </div>
                  <span className="text-[12px] text-white/60 font-mono shrink-0" dir="ltr">{formatEGP(o.total)}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor(o.status)}`}>{statusAr(o.status)}</span>
                </div>
              ))}
            </div>
          ) : <div className="text-[12px] text-white/15 py-10 text-center">لا توجد طلبات بعد</div>}
        </div>

        {/* Products */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">أحدث المنتجات</span>
            <button onClick={() => onNavigate('products')} className="text-[10px] text-white/25 hover:text-white/50 transition-colors">عرض الكل ←</button>
          </div>
          {recentProducts.length > 0 ? (
            <div className="space-y-1.5">
              {recentProducts.map(p => (
                <div key={p._id} className="flex items-center gap-3 py-2 px-1.5 rounded-md hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-white block truncate">{p.name}</span>
                    <span className="text-[9px] text-white/20">{p.createdAt}</span>
                  </div>
                  <span className="text-[12px] text-white/50 font-mono shrink-0" dir="ltr">{formatEGP(p.price)}</span>

                </div>
              ))}
            </div>
          ) : <div className="text-[12px] text-white/15 py-8 text-center">لا توجد منتجات بعد</div>}
        </div>
      </div>

      {/* Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">آخر التقييمات</span>
            <button onClick={() => onNavigate('reviews')} className="text-[10px] text-white/25 hover:text-white/50 transition-colors">عرض الكل ←</button>
          </div>
          {recentReviews.length > 0 ? (
            <div className="space-y-2">
              {recentReviews.map(rv => (
                <div key={rv._id} className="flex items-center gap-3 py-1.5 px-1.5 rounded-md hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-0.5 shrink-0" dir="ltr">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`h-3 w-3 ${s <= rv.rating ? 'text-amber-400 fill-amber-400' : 'text-white/10'}`} />)}
                  </div>
                  <div className="flex-1 min-w-0"><span className="text-[11px] text-white/50 block truncate">{rv.message || '—'}</span></div>
                  <span className="text-[9px] text-white/15 shrink-0">{rv.createdAt}</span>
                </div>
              ))}
            </div>
          ) : <div className="text-[12px] text-white/15 py-8 text-center">لا توجد تقييمات بعد</div>}
        </div>
      </div>
    </div>
  );
});
DashboardContent.displayName = 'DashboardContent';

// ── Main Admin Page ───────────────────────────────────────────

const AdminDashboard = () => {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      const validSections = ['dashboard', 'notifications', 'reviews', 'products', 'promo', 'orders', 'contacts', 'payment', 'governorates', 'funnel'];
      if (hash && validSections.includes(hash)) {
        setActiveSection(hash);
      }
    }
  }, []);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (typeof window !== 'undefined') {
      window.location.hash = section;
    }
  };

  return (
    <ProtectedAdminRoute>
      <div className="flex min-h-screen flex-col relative bg-stone-900">
        {/* Sidebar */}
        <SidebarNav
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          userName={session?.user?.name || "المدير"}
        />

        {/* Main Content - margin on right for RTL sidebar */}
        <main className="flex-1 p-3 md:p-6 lg:p-8 pb-20 lg:pb-8 overflow-x-hidden bg-stone-900 relative z-10 md:mr-[220px]" dir="rtl">
          <div className="max-w-7xl mx-auto pt-6 md:pt-10">
            {activeSection === 'dashboard' && <DashboardContent onNavigate={handleSectionChange} />}
            {activeSection === 'notifications' && <Notifications />}
            {activeSection === 'reviews' && <Reviews />}
            {activeSection === 'products' && <Products />}
            {activeSection === 'promo' && <PromoCodes />}
            {activeSection === 'orders' && <Orders />}
            {activeSection === 'contacts' && <Contacts />}
            {activeSection === 'payment' && <PaymentSettings />}
            {activeSection === 'governorates' && <Cities />}
            {activeSection === 'funnel' && <Funnel />}
          </div>
        </main>
      </div>
    </ProtectedAdminRoute>
  );
};

export default AdminDashboard;