"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import ProtectedAdminRoute from '@/components/auth/protected-admin-route';
import type { Article } from '@/repositories/articleRepository';

/** The guides list: publish state, and a link into the editor. */
export default function AdminGuidesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/guides');
      const data = await res.json();
      if (data.success) setArticles(data.articles);
      else toast.error(data.error || 'تعذر تحميل الأدلة');
    } catch {
      toast.error('تعذر تحميل الأدلة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const togglePublish = async (article: Article) => {
    const res = await fetch(`/api/admin/guides/${article._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !article.isPublished }),
    });
    const data = await res.json();

    if (data.success) {
      toast.success(data.article.isPublished ? 'تم النشر' : 'تم إلغاء النشر');
      load();
    } else {
      toast.error(data.error || 'فشل التحديث');
    }
  };

  const remove = async (article: Article) => {
    if (!confirm(`حذف "${article.title}" نهائياً؟`)) return;

    const res = await fetch(`/api/admin/guides/${article._id}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) { toast.success('تم الحذف'); load(); }
    else toast.error(data.error || 'فشل الحذف');
  };

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-stone-900 text-white p-6" dir="rtl">
        <div className="max-w-[1000px] mx-auto">

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold">أدلة التدريب</h1>
            <Link
              href="/admin/guides/new"
              className="bg-white text-black px-5 py-2 rounded-lg text-sm font-medium hover:bg-white/90"
            >
              دليل جديد
            </Link>
          </div>

          {loading ? (
            <p className="text-white/40 text-sm">جارٍ التحميل…</p>
          ) : articles.length === 0 ? (
            <p className="text-white/40 text-sm">لا توجد أدلة بعد.</p>
          ) : (
            <div className="space-y-3">
              {articles.map(article => (
                <div
                  key={String(article._id)}
                  className="flex items-center justify-between gap-4 p-4 bg-white/[0.03] border border-white/[0.08] rounded-xl"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{article.title}</p>
                    <p className="text-xs text-white/40 mt-1" dir="ltr">
                      /guides/{article.slug}
                      {article.titleAr ? ` · /ar/guides/${article.slugAr}` : ' · لا توجد نسخة عربية'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] px-2 py-1 rounded ${
                      article.isPublished ? 'bg-green-600/20 text-green-400' : 'bg-white/10 text-white/50'
                    }`}>
                      {article.isPublished ? 'منشور' : 'مسودة'}
                    </span>

                    <button
                      onClick={() => togglePublish(article)}
                      className="text-xs px-3 py-1.5 border border-white/15 rounded hover:border-white/40"
                    >
                      {article.isPublished ? 'إلغاء النشر' : 'نشر'}
                    </button>

                    <Link
                      href={`/admin/guides/${article._id}`}
                      className="text-xs px-3 py-1.5 border border-white/15 rounded hover:border-white/40"
                    >
                      تحرير
                    </Link>

                    <button
                      onClick={() => remove(article)}
                      className="text-xs px-3 py-1.5 border border-red-500/30 text-red-400 rounded hover:border-red-500"
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
