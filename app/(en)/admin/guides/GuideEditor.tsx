"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import ProtectedAdminRoute from '@/components/auth/protected-admin-route';
import FileUpload from '@/components/FileUpload';
import { renderMarkdown } from '@/lib/markdown';
import type { Article } from '@/repositories/articleRepository';

const EMPTY = {
  slug: '', slugAr: '',
  title: '', titleAr: '',
  excerpt: '', excerptAr: '',
  bodyMd: '', bodyMdAr: '',
  coverImage: '',
  tags: [] as string[],
  relatedProductIds: [] as string[],
  seoTitle: '', seoTitleAr: '',
  seoDescription: '', seoDescriptionAr: '',
  isPublished: false,
};

const input = "w-full p-3 bg-black/20 border border-white/[0.12] rounded-lg text-white focus:border-white/[0.3] focus:outline-none text-sm";

/**
 * The guide editor — Markdown in a textarea with a live preview.
 *
 * The preview runs the same renderer the public page uses, so what the author
 * sees is what ships, including the `[[product:slug]]` shortcode marker.
 */
export default function GuideEditor({ initial }: { initial?: Article }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [preview, setPreview] = useState(false);

  const [form, setForm] = useState({ ...EMPTY, ...(initial ?? {}) });
  const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const body = lang === 'ar' ? form.bodyMdAr : form.bodyMd;

  const save = async () => {
    if (!form.title.trim()) {
      toast.error('العنوان الإنجليزي مطلوب — منه يُبنى الرابط');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('تم الحفظ');
        router.push('/admin/guides');
      } else {
        toast.error(data.error || 'فشل الحفظ');
      }
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-stone-900 text-white p-6" dir="rtl">
        <div className="max-w-[1000px] mx-auto space-y-6">

          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">{initial ? 'تحرير دليل' : 'دليل جديد'}</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                className="text-xs px-4 py-2 border border-white/15 rounded hover:border-white/40"
              >
                {lang === 'en' ? 'التبديل للعربية' : 'Switch to English'}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="bg-white text-black px-5 py-2 rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50"
              >
                {saving ? 'جارٍ الحفظ…' : 'حفظ'}
              </button>
            </div>
          </div>

          <p className="text-xs text-white/40">
            تحرّر الآن: <strong className="text-white/70">{lang === 'en' ? 'الإنجليزية' : 'العربية'}</strong>
            {' · '}العنوان الإنجليزي مطلوب دائماً لأن الرابط يُبنى منه.
          </p>

          <div>
            <label className="block text-[13px] text-white/70 mb-2">
              {lang === 'en' ? 'Title' : 'العنوان بالعربية'}
            </label>
            <input
              className={input}
              dir={lang === 'en' ? 'ltr' : 'rtl'}
              value={lang === 'en' ? form.title : form.titleAr}
              onChange={e => set(lang === 'en' ? 'title' : 'titleAr', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[13px] text-white/70 mb-2">
              {lang === 'en' ? 'Excerpt (listing card)' : 'المقتطف (بطاقة القائمة)'}
            </label>
            <textarea
              className={input}
              rows={2}
              maxLength={300}
              dir={lang === 'en' ? 'ltr' : 'rtl'}
              value={lang === 'en' ? form.excerpt : form.excerptAr}
              onChange={e => set(lang === 'en' ? 'excerpt' : 'excerptAr', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[13px] text-white/70 mb-2">صورة الغلاف</label>
            <FileUpload
              label="صورة الغلاف"
              accept="image/*"
              currentUrl={form.coverImage}
              onUpload={(url: string) => set('coverImage', url)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] text-white/70">
                {lang === 'en' ? 'Body (Markdown)' : 'المحتوى (ماركداون)'}
              </label>
              <button
                onClick={() => setPreview(!preview)}
                className="text-xs px-3 py-1 border border-white/15 rounded hover:border-white/40"
              >
                {preview ? 'تحرير' : 'معاينة'}
              </button>
            </div>

            {preview ? (
              <div
                className="p-4 bg-black/20 border border-white/[0.12] rounded-lg text-sm text-[#b3b3b3] min-h-[300px]"
                dir={lang === 'en' ? 'ltr' : 'rtl'}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(body).html }}
              />
            ) : (
              <textarea
                className={`${input} font-mono`}
                rows={18}
                dir={lang === 'en' ? 'ltr' : 'rtl'}
                value={body}
                onChange={e => set(lang === 'en' ? 'bodyMd' : 'bodyMdAr', e.target.value)}
                placeholder={'## عنوان فرعي\n\nفقرة عادية.\n\n- عنصر قائمة\n\n[[product:floor-parallettes]]'}
              />
            )}

            <p className="mt-2 text-[12px] text-white/40">
              لإدراج بطاقة منتج داخل المقال اكتب <code dir="ltr">[[product:slug]]</code> في سطر مستقل.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[13px] text-white/70 mb-2">عنوان جوجل (٧٠ حرف)</label>
              <input
                className={input}
                maxLength={70}
                dir={lang === 'en' ? 'ltr' : 'rtl'}
                value={lang === 'en' ? form.seoTitle : form.seoTitleAr}
                onChange={e => set(lang === 'en' ? 'seoTitle' : 'seoTitleAr', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[13px] text-white/70 mb-2">وصف جوجل (١٦٠ حرف)</label>
              <textarea
                className={input}
                rows={2}
                maxLength={160}
                dir={lang === 'en' ? 'ltr' : 'rtl'}
                value={lang === 'en' ? form.seoDescription : form.seoDescriptionAr}
                onChange={e => set(lang === 'en' ? 'seoDescription' : 'seoDescriptionAr', e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={e => set('isPublished', e.target.checked)}
            />
            منشور
          </label>

        </div>
      </div>
    </ProtectedAdminRoute>
  );
}
