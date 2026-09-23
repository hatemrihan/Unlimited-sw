"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Save, Plus, Download, FileSpreadsheet, FileText, AlertCircle, Truck, Clock, Power, X } from 'lucide-react';
import { toast } from "sonner";

interface GovernorateData {
  name: string;
  shippingCost: number;
  codFee: number;
  isActive: boolean;
}

interface FreeShippingState {
  enabled: boolean;
  expiresAt: string | null;
  enabledBy: string | null;
  enabledAt: string | null;
  applyToAll: boolean;
  productIds: string[];
}

interface ProductOption {
  _id: string;
  name: string;
  price: number;
  mainImage?: string;
}

// ── Free Shipping Toggle Card ─────────────────────────────────────────────

function FreeShippingCard() {
  const [state, setState] = useState<FreeShippingState>({
    enabled: false,
    expiresAt: null,
    enabledBy: null,
    enabledAt: null,
    applyToAll: true,
    productIds: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expiryInput, setExpiryInput] = useState('');
  const [countdown, setCountdown] = useState('');
  const [applyToAll, setApplyToAll] = useState<boolean>(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/free-shipping');
      const data = await res.json();
      if (data.success) {
        setState({
          ...data.freeShipping,
          applyToAll: data.freeShipping.applyToAll ?? true,
          productIds: Array.isArray(data.freeShipping.productIds) ? data.freeShipping.productIds : [],
        });
        setApplyToAll(data.freeShipping.applyToAll ?? true);
        setSelectedProductIds(Array.isArray(data.freeShipping.productIds) ? data.freeShipping.productIds : []);
      }
    } catch {
      console.error('Failed to load free-shipping state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  // Load products when modal opens
  useEffect(() => {
    if (showConfirm && products.length === 0) {
      setLoadingProducts(true);
      fetch('/api/admin/products?limit=100')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.success && Array.isArray(data.products)) {
            setProducts(data.products.map((p: any) => ({
              _id: String(p._id),
              name: p.name || 'بدون اسم',
              price: p.price || 0,
              mainImage: p.mainImage || '',
            })));
          }
        })
        .catch(err => console.error('Failed to load products:', err))
        .finally(() => setLoadingProducts(false));
    }
  }, [showConfirm, products.length]);

  // ── Live countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!state.enabled || !state.expiresAt) { setCountdown(''); return; }

    const tick = () => {
      const diff = new Date(state.expiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('انتهى');
        setState(prev => ({ ...prev, enabled: false }));
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const parts: string[] = [];
      if (d > 0) parts.push(`${d} يوم`);
      if (h > 0) parts.push(`${h} ساعة`);
      if (m > 0) parts.push(`${m} دقيقة`);
      if (d === 0) parts.push(`${s} ثانية`);
      setCountdown(parts.join(' و '));
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.enabled, state.expiresAt]);

  // ── Turn ON ─────────────────────────────────────────────────────────────
  const handleEnable = async () => {
    if (!applyToAll && selectedProductIds.length === 0) {
      toast.error('يرجى اختيار منتج واحد على الأقل');
      return;
    }

    if (!expiryInput) {
      toast.error('يرجى تحديد تاريخ ووقت الانتهاء');
      return;
    }

    const expiry = new Date(expiryInput);
    if (expiry <= new Date()) {
      toast.error('يجب أن يكون التاريخ في المستقبل');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/free-shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          expiresAt: expiry.toISOString(),
          applyToAll,
          productIds: applyToAll ? [] : selectedProductIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم تفعيل الشحن المجاني! 🎉');
        setState(data.freeShipping);
        setShowConfirm(false);
        setExpiryInput('');
      } else {
        toast.error(data.error || 'فشل في التفعيل');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  // ── Turn OFF ────────────────────────────────────────────────────────────
  const handleDisable = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/free-shipping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم إيقاف الشحن المجاني');
        setState(prev => ({ ...prev, enabled: false }));
      } else {
        toast.error(data.error || 'فشل في الإيقاف');
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const minDatetime = () => {
    const d = new Date(Date.now() + 60_000);
    return d.toISOString().slice(0, 16);
  };

  const maxDatetime = () => {
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  };

  const formatExpiry = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase().trim())
  );

  if (loading) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center gap-2 text-white/40 text-[12px]">
          <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
        state.enabled
          ? 'bg-gradient-to-l from-emerald-500/[0.08] to-emerald-500/[0.02] border-emerald-500/30'
          : 'bg-white/[0.02] border-white/[0.08]'
      }`}>
        {/* Active pulse indicator */}
        {state.enabled && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-l from-emerald-400 to-emerald-600">
            <div className="absolute inset-0 bg-gradient-to-l from-emerald-300 to-emerald-500 animate-pulse" />
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {/* Left: Info */}
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-lg ${
                state.enabled ? 'bg-emerald-500/20' : 'bg-white/[0.06]'
              }`}>
                <Truck className={`h-5 w-5 ${state.enabled ? 'text-emerald-400' : 'text-white/40'}`} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-white flex items-center gap-2">
                  شحن مجاني للمحافظات
                  {state.enabled && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-medium rounded-full">
                      مُفعّل ({state.applyToAll ? 'جميع المنتجات' : `${state.productIds.length} منتجات`})
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {state.enabled
                    ? state.applyToAll
                      ? 'الشحن ورسوم الدفع عند الاستلام مجاني حالياً لجميع المحافظات (جميع المنتجات)'
                      : `الشحن ورسوم الدفع عند الاستلام مجاني حالياً لـ (${state.productIds.length}) منتجات محددة`
                    : 'تفعيل الشحن المجاني لفترة محددة (لجميع المنتجات أو منتجات محددة)'}
                </p>

                {/* Active state details */}
                {state.enabled && state.expiresAt && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/80">
                      <Clock className="h-3 w-3" />
                      <span>ينتهي: {formatExpiry(state.expiresAt)}</span>
                    </div>
                    {countdown && (
                      <div className="text-[13px] font-mono font-semibold text-emerald-400" dir="ltr">
                        ⏱ {countdown}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Toggle button */}
            <div className="flex items-center gap-2 sm:mt-1">
              {state.enabled ? (
                <button
                  onClick={handleDisable}
                  disabled={saving}
                  className="h-9 px-4 flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg text-[12px] font-medium transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Power className="h-3.5 w-3.5" />}
                  إيقاف الشحن المجاني
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="h-9 px-4 flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg text-[12px] font-medium transition-all"
                >
                  <Truck className="h-3.5 w-3.5" />
                  تفعيل الشحن المجاني
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirmation Dialog ──────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Truck className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-[15px] font-semibold text-white">تفعيل الشحن المجاني</h3>
              </div>
              <button
                onClick={() => { setShowConfirm(false); setExpiryInput(''); }}
                className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4 text-white/40" />
              </button>
            </div>

            {/* Scope selection */}
            <div className="mb-4">
              <label className="block text-[12px] text-white/70 mb-2 font-medium">نطاق تطبيق الشحن المجاني:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setApplyToAll(true)}
                  className={`p-2.5 rounded-xl border text-[12px] font-medium transition-all text-center ${
                    applyToAll
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.03] border-white/[0.08] text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  جميع المنتجات
                </button>
                <button
                  type="button"
                  onClick={() => setApplyToAll(false)}
                  className={`p-2.5 rounded-xl border text-[12px] font-medium transition-all text-center ${
                    !applyToAll
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.03] border-white/[0.08] text-white/60 hover:bg-white/[0.06]'
                  }`}
                >
                  منتجات محددة
                </button>
              </div>
            </div>

            {/* Specific products picker */}
            {!applyToAll && (
              <div className="mb-4 p-3 bg-white/[0.02] border border-white/[0.08] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-white/60">
                    اختر المنتجات المؤهلة ({selectedProductIds.length} محددة)
                  </span>
                  {products.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedProductIds.length === products.length) {
                          setSelectedProductIds([]);
                        } else {
                          setSelectedProductIds(products.map(p => p._id));
                        }
                      }}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      {selectedProductIds.length === products.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                    </button>
                  )}
                </div>

                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="ابحث عن منتج..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-[12px] focus:outline-none focus:border-emerald-500/40"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                  {loadingProducts ? (
                    <div className="py-4 text-center text-white/40 text-[11px] flex items-center justify-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> جاري تحميل المنتجات...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="py-3 text-center text-white/40 text-[11px]">
                      لا توجد منتجات مطابقة
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p._id);
                      return (
                        <div
                          key={p._id}
                          onClick={() => {
                            setSelectedProductIds(prev =>
                              isSelected ? prev.filter(id => id !== p._id) : [...prev, p._id]
                            );
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/10 border border-emerald-500/30'
                              : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="accent-emerald-500 h-3.5 w-3.5 rounded pointer-events-none"
                            />
                            {p.mainImage ? (
                              <img src={p.mainImage} alt="" className="h-7 w-7 rounded object-cover border border-white/10" />
                            ) : (
                              <div className="h-7 w-7 rounded bg-white/10 flex items-center justify-center text-[10px] text-white/40">
                                📦
                              </div>
                            )}
                            <span className="text-[12px] text-white truncate max-w-[210px]">
                              {p.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-white/50 font-mono flex-shrink-0">
                            {p.price} ج.م
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="p-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-lg mb-4">
              <p className="text-[11px] text-amber-400 leading-relaxed">
                ⚠️ سيتم إعفاء {applyToAll ? 'جميع المنتجات' : `${selectedProductIds.length} منتج محدد`} من رسوم الشحن ورسوم الدفع عند الاستلام حتى التاريخ المحدد.
              </p>
            </div>

            {/* Date picker */}
            <div className="mb-5">
              <label className="block text-[12px] text-white/60 mb-2">ينتهي الشحن المجاني في:</label>
              <input
                type="datetime-local"
                value={expiryInput}
                min={minDatetime()}
                max={maxDatetime()}
                onChange={(e) => setExpiryInput(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.1] rounded-lg text-white text-[13px] focus:outline-none focus:border-emerald-500/50 transition-colors"
                dir="ltr"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleEnable}
                disabled={saving || !expiryInput || (!applyToAll && selectedProductIds.length === 0)}
                className="flex-1 h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                تأكيد التفعيل
              </button>
              <button
                onClick={() => { setShowConfirm(false); setExpiryInput(''); }}
                className="h-10 px-4 flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.1] text-white/60 rounded-lg text-[13px] transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

const CitiesManagement = () => {
  const [governorates, setGovernorates] = useState<GovernorateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch governorates data
  const fetchGovernorates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/cities');
      const data = await response.json();

      if (data.success) {
        // Convert aggregated data to governorate format
        const govData: GovernorateData[] = data.cities.map((item: any) => ({
          name: item.cityName, // This is actually governorate name from API
          shippingCost: item.shippingCost || 0,
          codFee: item.codFee || 0,
          isActive: item.isActive !== false
        }));

        setGovernorates(govData);
      } else {
        toast.error('فشل في تحميل المحافظات');
      }
    } catch (error) {
      console.error('Error fetching governorates:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernorates();
  }, []);

  // Update governorate shipping cost
  const updateShippingCost = (govName: string, newCost: number) => {
    setGovernorates(prev => prev.map(gov =>
      gov.name === govName ? { ...gov, shippingCost: newCost } : gov
    ));
  };

  // Update governorate COD fee
  const updateCodFee = (govName: string, newFee: number) => {
    setGovernorates(prev => prev.map(gov =>
      gov.name === govName ? { ...gov, codFee: newFee } : gov
    ));
  };

  // Toggle governorate active status
  const toggleActive = (govName: string) => {
    setGovernorates(prev => prev.map(gov =>
      gov.name === govName ? { ...gov, isActive: !gov.isActive } : gov
    ));
  };

  // Add new governorates (Fayoum, Damietta + 5 Additional)
  const handleAddNewGovernorates = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/admin/cities/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`تم إضافة ${data.results.added.length} محافظة جديدة بنجاح!`);
        await fetchGovernorates();
      } else {
        throw new Error(data.error || 'Failed to add governorates');
      }
    } catch (error) {
      console.error('Error adding governorates:', error);
      toast.error('فشل في إضافة المحافظات، يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  // Save all changes - Only update global default rates
  const handleSaveAll = async () => {
    setSaving(true);

    try {
      for (const gov of governorates) {
        const response = await fetch('/api/admin/cities/global-defaults', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            governorate: gov.name,
            shippingCost: gov.shippingCost,
            codFee: gov.codFee,
            isActive: gov.isActive
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to update ${gov.name}`);
        }
      }

      toast.success('تم تحديث أسعار الشحن الافتراضية بنجاح!');
    } catch (error) {
      console.error('Error saving governorates:', error);
      toast.error('فشل في حفظ التغييرات، يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  // Export functions
  const exportAsCSV = () => {
    const headers = ['Governorate', 'Shipping Cost', 'COD Fee', 'Status'];
    const rows = governorates.map(gov => [
      gov.name,
      gov.shippingCost.toString(),
      gov.codFee.toString(),
      gov.isActive ? 'Active' : 'Inactive'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'governorate-pricing.csv';
    a.click();
  };

  const exportAsExcel = () => {
    const table = `
      <table>
        <thead>
          <tr>
            <th>Governorate</th>
            <th>Shipping Cost (LE)</th>
            <th>COD Fee (LE)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${governorates.map(gov => `
            <tr>
              <td>${gov.name}</td>
              <td>${gov.shippingCost}</td>
              <td>${gov.codFee}</td>
              <td>${gov.isActive ? 'Active' : 'Inactive'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'governorate-pricing.xls';
    a.click();
  };

  const exportAsTXT = () => {
    const content = governorates.map(gov =>
      `${gov.name}: Shipping ${gov.shippingCost} LE, COD ${gov.codFee} LE (${gov.isActive ? 'Active' : 'Inactive'})`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'governorate-pricing.txt';
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      </div>
    );
  }

  const activeCount = governorates.filter(g => g.isActive).length;
  const avgShipping = Math.round(governorates.reduce((sum, g) => sum + g.shippingCost, 0) / (governorates.length || 1));
  const avgCod = Math.round(governorates.reduce((sum, g) => sum + g.codFee, 0) / (governorates.length || 1));

  return (
    <div className="space-y-6 max-w-[1100px]" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-white leading-none">إدارة المحافظات والشحن</h2>
          <p className="text-[11px] text-white/40 mt-1.5 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
            هذه الأسعار الافتراضية للمنتجات الجديدة فقط. كل منتج يمكن أن يكون له تسعير خاص.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="h-9 px-4 flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[12px] font-medium transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            حفظ الأسعار
          </button>
        </div>
      </div>

      {/* 🆕 Free Shipping Toggle */}
      <FreeShippingCard />

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleAddNewGovernorates}
          disabled={saving}
          className="h-8 px-3 flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-[11px] font-medium rounded-md transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          إضافة محافظات ناقصة
        </button>

        <div className="h-4 w-px bg-white/[0.1] mx-1"></div>

        <button
          onClick={exportAsCSV}
          className="h-8 px-3 flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-[11px] font-medium rounded-md transition-colors"
        >
          <Download className="h-3 w-3" />
          CSV
        </button>
        <button
          onClick={exportAsExcel}
          className="h-8 px-3 flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-[11px] font-medium rounded-md transition-colors"
        >
          <FileSpreadsheet className="h-3 w-3" />
          Excel
        </button>
        <button
          onClick={exportAsTXT}
          className="h-8 px-3 flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-[11px] font-medium rounded-md transition-colors"
        >
          <FileText className="h-3 w-3" />
          TXT
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.08] p-4 rounded-xl">
          <p className="text-[11px] text-white/40 mb-1">المحافظات النشطة</p>
          <p className="text-xl font-semibold text-white">{activeCount}</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.08] p-4 rounded-xl">
          <p className="text-[11px] text-white/40 mb-1">متوسط الشحن</p>
          <p className="text-xl font-semibold text-white">{avgShipping} ج.م</p>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.08] p-4 rounded-xl">
          <p className="text-[11px] text-white/40 mb-1">متوسط رسوم الدفع عند الاستلام</p>
          <p className="text-xl font-semibold text-white">{avgCod} ج.م</p>
        </div>
      </div>

      {/* Governorates Table */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-[12px]">
            <thead className="bg-white/[0.02] border-b border-white/[0.08] text-white/40">
              <tr>
                <th className="px-4 py-3 font-medium w-[25%]">المحافظة</th>
                <th className="px-4 py-3 font-medium w-[20%] text-center">تكلفة الشحن (ج.م)</th>
                <th className="px-4 py-3 font-medium w-[20%] text-center">رسوم الدفع (COD)</th>
                <th className="px-4 py-3 font-medium w-[20%] text-center">الإجمالي </th>
                <th className="px-4 py-3 font-medium w-[15%] text-left">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {governorates.map(gov => (
                <tr key={gov.name} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-4 py-3.5 font-medium text-white">{gov.name}</td>
                  <td className="px-4 py-3.5">
                    <input
                      type="number"
                      value={gov.shippingCost}
                      min="0"
                      onChange={(e) => updateShippingCost(gov.name, Number(e.target.value))}
                      className="w-full max-w-[80px] mx-auto block p-1.5 bg-black/20 border border-white/10 rounded text-white text-center text-[12px] focus:outline-none focus:border-white/30"
                      dir="ltr"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <input
                      type="number"
                      value={gov.codFee}
                      min="0"
                      onChange={(e) => updateCodFee(gov.name, Number(e.target.value))}
                      className="w-full max-w-[80px] mx-auto block p-1.5 bg-black/20 border border-white/10 rounded text-white text-center text-[12px] focus:outline-none focus:border-white/30"
                      dir="ltr"
                    />
                  </td>
                  <td className="px-4 py-3.5 font-medium text-white/60 text-center">
                    {gov.shippingCost + gov.codFee} ج.م
                  </td>
                  <td className="px-4 py-3.5 text-left border-0 m-0">
                    <button
                      onClick={() => toggleActive(gov.name)}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${gov.isActive
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'
                        }`}
                    >
                      {gov.isActive ? 'مفعل' : 'معطل'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default CitiesManagement;
