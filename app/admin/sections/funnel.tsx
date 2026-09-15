"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, TrendingDown, ShoppingCart, Wallet, Users, AlertCircle } from 'lucide-react';
import type { FunnelReport } from '@/analytics/actions';

const PERIODS = [
  { value: '7d', label: 'آخر ٧ أيام' },
  { value: '30d', label: 'آخر ٣٠ يوم' },
  { value: '90d', label: 'آخر ٩٠ يوم' },
];

const egp = (amount: number) => `${Math.round(amount).toLocaleString('en-EG')} ج.م`;

/**
 * The conversion funnel.
 *
 * Reads one endpoint and draws four things: the stages, the money, where
 * baskets are abandoned, and a day-by-day chart.
 *
 * Arabic-first, matching the rest of the dashboard. Every number is a count of
 * SESSIONS, not of events — the distinction is in the aggregation, but it is
 * repeated in the labels here because "1,240 visitors" and "1,240 page views"
 * lead to different decisions and look identical on a screen.
 */
const Funnel = () => {
  const [report, setReport] = useState<FunnelReport | null>(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selected: string, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/funnel?period=${selected}`, { signal });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError('تعذر تحميل تقرير المسار. حاول تاني بعد شوية.');
        return;
      }

      setReport(data.report);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setError('تعذر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(period, controller.signal);
    return () => controller.abort();
  }, [period, load]);

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!report) return null;

  const hasData = report.totalEvents > 0;
  const topStage = report.funnel[0]?.sessions ?? 0;
  const busiestDay = Math.max(
    1,
    ...report.dailyChart.map(day => day.PageView ?? 0)
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">مسار التحويل</h2>
          <p className="text-sm text-white/50">
            كل رقم هنا يمثل زائر مختلف، مش عدد الأحداث — بتوقيت القاهرة
          </p>
        </div>

        <div className="flex gap-2">
          {PERIODS.map(option => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`rounded-lg px-4 py-2 text-sm transition-colors ${
                period === option.value
                  ? 'bg-white text-black'
                  : 'bg-white/[0.03] text-white/70 hover:bg-white/[0.08]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-center text-white/60">
          لسه مفيش بيانات في الفترة دي. الأرقام هتظهر هنا أول ما الزوار يبدأوا يتصفحوا.
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={<Users className="w-5 h-5" />}
          label="زوار"
          value={topStage.toLocaleString('en-EG')}
        />
        <Kpi
          icon={<Wallet className="w-5 h-5" />}
          label="الإيرادات"
          value={egp(report.totalRevenue)}
          hint={`${report.orders} طلب — متوسط ${egp(report.averageOrderValue)}`}
        />
        <Kpi
          icon={<TrendingDown className="w-5 h-5" />}
          label="نسبة التحويل"
          value={`${report.conversionRate}%`}
          hint="من الزيارة للشراء"
        />
        <Kpi
          icon={<ShoppingCart className="w-5 h-5" />}
          label="ترك السلة"
          value={`${report.cartAbandonmentRate}%`}
          hint={`وترك الدفع ${report.checkoutAbandonmentRate}%`}
        />
      </div>

      {/* ── The funnel itself ──────────────────────────────────────────── */}
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <h3 className="mb-4 text-base font-medium text-white">المراحل</h3>

        <div className="space-y-4">
          {report.funnel.map((stage, index) => (
            <div key={stage.name}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="text-white/80">{stage.label}</span>
                <span className="tabular-nums text-white/60">
                  {stage.sessions.toLocaleString('en-EG')}
                  <span className="mr-2 text-white/40">({stage.percentOfTop}%)</span>
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-white/70 transition-all duration-500"
                  style={{ width: `${Math.max(stage.percentOfTop, hasData && stage.sessions > 0 ? 2 : 0)}%` }}
                />
              </div>

              {/* The drop-off is the actionable number — it says which step is
                  losing people, which the absolute counts do not. */}
              {index > 0 && stage.dropOff > 0 && (
                <p className="mt-1 text-xs text-amber-400/80">
                  فقدنا {stage.dropOff}% من المرحلة اللي قبلها
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Abandoned baskets ──────────────────────────────────────────── */}
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <h3 className="mb-1 text-lg font-medium text-white">منتجات اتساب في السلة</h3>
        <p className="mb-6 text-sm text-white/50">
          اتحطت في السلة ومحدش من الزوار دول اشترى حاجة
        </p>

        {report.topAbandoned.length === 0 ? (
          <p className="text-sm text-white/40">مفيش سلال متروكة في الفترة دي.</p>
        ) : (
          <ul className="space-y-3">
            {report.topAbandoned.map(product => (
              <li key={product.productId} className="flex items-center justify-between gap-4">
                <span className="truncate text-white/80">{product.productName}</span>
                <span className="shrink-0 tabular-nums text-white/50">
                  {product.sessions.toLocaleString('en-EG')} زائر
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Daily chart ────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <h3 className="mb-4 text-base font-medium text-white">يوم بيوم</h3>

        {report.dailyChart.length === 0 ? (
          <p className="text-sm text-white/40">مفيش بيانات لعرضها.</p>
        ) : (
          <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: '9rem' }}>
            {report.dailyChart.map(day => (
              <div key={day.day} className="flex min-w-[1.75rem] flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full flex-col justify-end gap-0.5">
                  <div
                    className="w-full rounded-sm bg-white/25"
                    style={{ height: `${((day.PageView ?? 0) / busiestDay) * 100}%` }}
                    title={`زيارات: ${day.PageView ?? 0}`}
                  />
                  <div
                    className="w-full rounded-sm bg-emerald-400/70"
                    style={{ height: `${((day.Purchase ?? 0) / busiestDay) * 100}%` }}
                    title={`مشتريات: ${day.Purchase ?? 0}`}
                  />
                </div>
                <span className="whitespace-nowrap text-[10px] text-white/40">
                  {day.day.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Where the numbers come from ────────────────────────────────── */}
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <h3 className="mb-5 text-lg font-medium text-white">مصادر القياس</h3>

        {/* ── Internal analytics ── */}
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <div>
              <p className="text-sm font-medium text-white">التحليلات الداخلية</p>
              <p className="text-xs text-white/40">MongoDB — الأرقام اللي في التقرير ده</p>
            </div>
            <span className="mr-auto rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-300">
              يعمل
            </span>
          </div>
          <p className="text-xs leading-relaxed text-white/40 mt-1">
            بتتحسب من الطلبات نفسها، مش من المتصفح — يعني بتفضل صح حتى لو
            الزائر مركّب مانع إعلانات أو قفل الصفحة بسرعة.
          </p>
        </div>

        {/* ── Third-party trackers ── */}
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-white/30 mb-3">أدوات خارجية</p>

          <div className="space-y-3">
            {/* Google Analytics */}
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4B400]/15">
                <svg className="w-4 h-4 text-[#F4B400]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.84 2.9982V21.0018C22.84 22.1044 21.9426 22.9982 20.84 22.9982H18.84C17.7354 22.9982 16.84 22.1044 16.84 21.0018V2.9982C16.84 1.8956 17.7354 1.0018 18.84 1.0018H20.84C21.9426 1.0018 22.84 1.8956 22.84 2.9982Z" />
                  <path d="M14.42 11.0018V21.0018C14.42 22.1044 13.5246 22.9982 12.42 22.9982H10.42C9.31543 22.9982 8.42 22.1044 8.42 21.0018V11.0018C8.42 9.8992 9.31543 9.0018 10.42 9.0018H12.42C13.5246 9.0018 14.42 9.8992 14.42 11.0018Z" />
                  <circle cx="3.66" cy="20.5" r="2.5" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80">Google Analytics 4</p>
                <p className="text-xs text-white/35">الجمهور والاكتساب والسلوك</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#F4B400]/10 px-3 py-1 text-xs text-[#F4B400]/80">
                مستقل
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06]" />

            {/* Meta Pixel */}
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0081FB]/15">
                <svg className="w-4 h-4 text-[#0081FB]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C18.34 21.21 22 17.06 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80">Meta Pixel</p>
                <p className="text-xs text-white/35">إعادة الاستهداف وتتبع حملات الإعلانات</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#0081FB]/10 px-3 py-1 text-xs text-[#0081FB]/80">
                مستقل
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
      <div className="mb-2 flex items-center gap-2 text-white/50">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-xl font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

export default Funnel;
