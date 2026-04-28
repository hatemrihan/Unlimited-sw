"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit2, Trash2, Loader2, Tag, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PromoCode {
  _id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  minAmount?: number;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  description?: string;
}

const PromoCodes = () => {
  const router = useRouter();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPromoCodes = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setLoading(true);
      
      const response = await fetch('/api/promo');

      if (response.ok) {
        const data = await response.json();
        setPromoCodes(data.promoCodes || []);
      } else {
        toast.error('فشل في جلب أكواد الخصم');
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast.error('خطأ في جلب أكواد الخصم');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleEditPromoCode = (promoCode: PromoCode) => {
    router.push(`/admin/edit-promo-code/${promoCode._id}`);
  };

  const togglePromoCodeStatus = async (promoCode: PromoCode) => {
    try {
      const response = await fetch(`/api/promo/${promoCode._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !promoCode.isActive
        }),
      });

      if (response.ok) {
        setPromoCodes(promoCodes.map(pc =>
          pc._id === promoCode._id
            ? { ...pc, isActive: !pc.isActive }
            : pc
        ));
        toast.success(`تم ${!promoCode.isActive ? 'تفعيل' : 'إيقاف'} كود الخصم بنجاح!`);
      } else {
        toast.error('فشل في تحديث حالة كود الخصم');
      }
    } catch (error) {
      console.error('Error updating promo code status:', error);
      toast.error('خطأ في تحديث حالة كود الخصم');
    }
  };

  const handleDeletePromoCode = (promoCodeId: string) => {
    router.push(`/admin/delete-promo-code/${promoCodeId}`);
  };

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  const filteredCodes = promoCodes.filter(pc => {
    const matchesSearch = pc.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (pc.description && pc.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === '' ? true : 
                          statusFilter === 'active' ? pc.isActive : 
                          !pc.isActive;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-[1100px] w-full" dir="rtl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-white leading-none">أكواد الخصم</h2>
          <p className="text-[11px] text-white/25 mt-1.5">إدارة أكواد الخصم والعروض الترويجية</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPromoCodes(true)}
            disabled={isRefreshing}
            className="flex items-center justify-center p-1.5 h-8 w-8 bg-white/[0.06] border border-white/[0.08] rounded text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-50"
          >
            {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={() => router.push('/admin/add-promo-code')}
            className="flex items-center justify-center h-8 px-4 bg-white text-black hover:bg-white/90 rounded text-[11px] font-medium transition-colors gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة كود جديد
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="بحث عن كود خصم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 h-9 bg-white/[0.02] border border-white/[0.08] text-white text-[12px] rounded-lg focus:border-white/20 focus:outline-none transition-all placeholder:text-white/20"
          />
        </div>

        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 bg-white/[0.02] border border-white/[0.08] text-white text-[12px] rounded-lg focus:border-white/20 focus:outline-none transition-all sm:w-40 outline-none appearance-none cursor-pointer"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(255, 255, 255, 0.4)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'left 0.75rem center', backgroundSize: '16px' }}
        >
          <option value="" className="bg-[#1c1917] text-white">جميع الحالات</option>
          <option value="active" className="bg-[#1c1917] text-white">نشط</option>
          <option value="inactive" className="bg-[#1c1917] text-white">غير نشط</option>
        </select>
      </div>

      {/* Promo Codes List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border border-white/[0.04] rounded-lg bg-white/[0.01]">
          <Loader2 className="w-6 h-6 animate-spin text-white/20 mb-3" />
          <span className="text-[12px] text-white/40">جاري تحميل أكواد الخصم...</span>
        </div>
      ) : filteredCodes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredCodes.map((promoCode) => (
            <div key={promoCode._id} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 transition-all hover:bg-white/[0.04] flex flex-col h-full">
              {/* Promo Code Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-mono font-bold text-white tracking-wider">
                  {promoCode.code}
                </div>
                <button
                  onClick={() => togglePromoCodeStatus(promoCode)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${promoCode.isActive
                      ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                      : 'bg-white/[0.06] text-white/40 border-white/[0.04] hover:bg-white/[0.1]'
                    }`}
                >
                  {promoCode.isActive ? 'نشط' : 'غير نشط'}
                </button>
              </div>

              {/* Discount Info */}
              <div className="space-y-1 mb-4 flex-grow">
                <div className="text-[12px] font-medium text-amber-400">
                  {promoCode.type === 'percentage' ? `خصم ${promoCode.discount}%` : `خصم ${promoCode.discount.toLocaleString()} ج.م`}
                </div>
                {promoCode.description && (
                  <div className="text-[10px] text-white/40 line-clamp-2 leading-relaxed">
                    {promoCode.description}
                  </div>
                )}
              </div>

              {/* Usage Info */}
              <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.04] mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">الاستخدام</span>
                  <span className="text-white font-mono text-[11px]">
                    {promoCode.currentUses} / {promoCode.maxUses || '∞'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">صالح حتى</span>
                  <span className="text-white/60 font-mono text-[10px]">
                    {new Date(promoCode.validUntil).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1.5 mt-auto">
                <button
                  onClick={() => handleEditPromoCode(promoCode)}
                  className="flex-1 flex items-center justify-center gap-1 h-7 bg-white/[0.04] hover:bg-blue-500/10 text-blue-400 border border-white/[0.04] hover:border-blue-500/20 rounded text-[11px] font-medium transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  تعديل
                </button>
                <button
                  onClick={() => handleDeletePromoCode(promoCode._id)}
                  className="flex-1 flex items-center justify-center gap-1 h-7 bg-white/[0.04] hover:bg-red-500/10 text-red-400 border border-white/[0.04] hover:border-red-500/20 rounded text-[11px] font-medium transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border border-white/[0.04] rounded-lg bg-white/[0.01]">
          <div className="w-12 h-12 rounded-full bg-white/[0.02] flex items-center justify-center mb-4">
            <Tag className="w-5 h-5 text-white/20" />
          </div>
          <p className="text-[12px] text-white/40 mb-4">
            {searchQuery ? 'لم يتم العثور على نتائج بحث.' : 'لا يوجد أكواد خصم حتى الآن.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => router.push('/admin/add-promo-code')}
              className="h-8 px-4 bg-white text-black hover:bg-white/90 rounded text-[11px] font-medium transition-colors"
            >
              إنشاء أول كود خصم
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PromoCodes;