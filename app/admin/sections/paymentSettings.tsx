"use client";

import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CreditCard, Banknote, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentSettings {
  codEnabled: boolean;
  instaPayEnabled: boolean;
}

const PaymentSettings = () => {
  const [settings, setSettings] = useState<PaymentSettings>({
    codEnabled: true,
    instaPayEnabled: true,
  });
  /** What is actually stored, so we can tell whether anything was changed. */
  const [saved, setSaved] = useState<PaymentSettings>({
    codEnabled: true,
    instaPayEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasChanges = settings.codEnabled !== saved.codEnabled;

  const fetchSettings = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/payment-settings', { signal });
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setSaved(data.settings);
      } else {
        toast.error('فشل في تحميل إعدادات الدفع');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error fetching payment settings:', error);
      toast.error('حدث خطأ أثناء تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codEnabled: settings.codEnabled,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        setSaved(data.settings);
        toast.success('تم تحديث إعدادات الدفع بنجاح!');
      } else {
        toast.error(data.error || 'فشل في تحديث الإعدادات');
      }
    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchSettings(controller.signal);
    return () => controller.abort();
  }, []);

  // Warn before leaving with an unsaved toggle. Switching off Cash on Delivery
  // and then closing the tab used to look exactly like a successful change.
  useEffect(() => {
    if (!hasChanges) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1100px]" dir="rtl">
      {/* Header */}
      <div>
        <h2 className="text-[15px] font-semibold text-white leading-none">إعدادات الدفع</h2>
        <p className="text-[11px] text-white/40 mt-1.5">التحكم في طرق الدفع المتاحة للعملاء</p>
      </div>

      {/* Main Card */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/[0.08]">
          <h3 className="text-[13px] font-medium text-white">طرق الدفع</h3>
          <p className="text-[11px] text-white/40 mt-1">قم بتفعيل أو تعطيل طرق الدفع في صفحة إتمام الطلب</p>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          
          {/* InstaPay */}
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-[13px] font-medium text-white">InstaPay</h4>
                <p className="text-[11px] text-white/40 mt-0.5">الدفع عبر الموبايل مع التحقق بصورة الإيصال</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">مفعل دائماً</span>
              <Switch checked={true} disabled className="opacity-50" />
            </div>
          </div>

          {/* Cash on Delivery */}
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center shrink-0">
                <Banknote className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h4 className="text-[13px] font-medium text-white">الدفع عند الاستلام (COD)</h4>
                <p className="text-[11px] text-white/40 mt-0.5">الدفع نقداً عند استلام الطلب</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${settings.codEnabled ? 'text-green-400 bg-green-500/10' : 'text-white/40 bg-white/[0.04]'}`}>
                {settings.codEnabled ? 'مفعل' : 'معطل'}
              </span>
              <Switch 
                checked={settings.codEnabled} 
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, codEnabled: checked }))} 
              />
            </div>
          </div>

        </div>

        {/* Footer info & Save */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-black/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-white/30 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-white/60">ملاحظات هامة:</p>
              <ul className="text-[10px] text-white/40 mt-1 space-y-0.5">
                <li>• طريقة الدفع InstaPay مفعلة دائماً ولا يمكن إيقافها.</li>
                <li>• سيتم تطبيق أي تغييرات فوراً على صفحة الدفع.</li>
              </ul>
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving || !hasChanges}
            className="w-full sm:w-auto h-9 px-4 flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[12px] font-medium transition-colors"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;
