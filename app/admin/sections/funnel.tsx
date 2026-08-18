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
    <div className="space-y-8" dir="rtl">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">مسار التحويل</h2>
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
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
          لسه مفيش بيانات في الفترة دي. الأرقام هتظهر هنا أول ما الزوار يبدأوا يتصفحوا.
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <h3 className="mb-6 text-lg font-medium text-white">المراحل</h3>

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

              <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
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
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
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
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <h3 className="mb-6 text-lg font-medium text-white">يوم بيوم</h3>

        {report.dailyChart.length === 0 ? (
          <p className="text-sm text-white/40">مفيش بيانات لعرضها.</p>
        ) : (
          <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: '9rem' }}>
            {report.dailyChart.map(day => (
              <div key={day.day} className="flex min-w-[1.75rem] flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full flex-col justify-end gap-0.5">
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
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <h3 className="mb-4 text-lg font-medium text-white">مصادر القياس</h3>

        <ul className="space-y-3 text-sm">
          <li className="flex items-center justify-between">
            <span className="text-white/70">التحليلات الداخلية (MongoDB)</span>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-300">
              يعمل
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-white/70">Google Analytics 4</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/60">
              مستقل عن التقرير ده
            </span>
          </li>
        </ul>

        <p className="mt-4 text-xs leading-relaxed text-white/40">
          الأرقام دي بتتحسب من الطلبات نفسها، مش من المتصفح — يعني بتفضل صح حتى لو
          الزائر مركّب مانع إعلانات أو قفل الصفحة بسرعة.
        </p>
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
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2 text-white/50">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

export default Funnel;
