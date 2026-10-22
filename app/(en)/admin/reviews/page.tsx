"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import ProtectedAdminRoute from '@/components/auth/protected-admin-route';
import type { Review } from '@/repositories/reviewRepository';

/**
 * Review moderation.
 *
 * Nothing a customer writes appears on the site, or in the star rating Google
 * shows, until somebody approves it here.
 */
export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/reviews');
      const data = await res.json();
      if (data.success) setReviews(data.reviews);
      else toast.error(data.error || 'تعذر تحميل التقييمات');
    } catch {
      toast.error('تعذر تحميل التقييمات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (review: Review, approved: boolean) => {
    const res = await fetch(`/api/admin/reviews/${review._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    });
    const data = await res.json();

    if (data.success) { toast.success(approved ? 'تمت الموافقة' : 'تم الرفض'); load(); }
    else toast.error(data.error || 'فشل التحديث');
  };

  const remove = async (review: Review) => {
    if (!confirm('حذف هذا التقييم نهائياً؟')) return;

    const res = await fetch(`/api/admin/reviews/${review._id}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) { toast.success('تم الحذف'); load(); }
    else toast.error(data.error || 'فشل الحذف');
  };

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-stone-900 text-white p-6" dir="rtl">
        <div className="max-w-[900px] mx-auto">

          <h1 className="text-xl font-bold mb-2">مراجعة التقييمات</h1>
          <p className="text-xs text-white/40 mb-8">
            لا يظهر أي تقييم على الموقع ولا في تقييم النجوم على جوجل قبل الموافقة عليه هنا.
          </p>

          {loading ? (
            <p className="text-white/40 text-sm">جارٍ التحميل…</p>
          ) : reviews.length === 0 ? (
            <p className="text-white/40 text-sm">لا توجد تقييمات في انتظار المراجعة.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={String(review._id)} className="p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      {review.name}
                      <span className="text-yellow-400 mr-2">{'★'.repeat(review.rating)}</span>
                      <span className="text-white/30">{'★'.repeat(5 - review.rating)}</span>
                    </p>
                    <p className="text-xs text-white/40" dir="ltr">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-GB') : ''}
                    </p>
                  </div>

                  <p className="text-sm text-[#b3b3b3] leading-relaxed mb-3" dir="auto">{review.text}</p>
                  <p className="text-[11px] text-white/30 mb-3" dir="ltr">product: {review.productId}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => act(review, true)}
                      className="text-xs px-4 py-1.5 bg-green-600/20 text-green-400 border border-green-600/30 rounded hover:border-green-500"
                    >
                      موافقة ونشر
                    </button>
                    <button
                      onClick={() => remove(review)}
                      className="text-xs px-4 py-1.5 border border-red-500/30 text-red-400 rounded hover:border-red-500"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </ProtectedAdminRoute>
  );
}
