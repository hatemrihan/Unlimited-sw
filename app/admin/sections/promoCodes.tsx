"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Tag,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Users,
  LayoutList,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  waiveShipping?: boolean;
}

const PromoCodes = () => {
  const router = useRouter();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

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
          isActive: !promoCode.isActive,
        }),
      });

      if (response.ok) {
        setPromoCodes((prev) =>
          prev.map((pc) =>
            pc._id === promoCode._id ? { ...pc, isActive: !pc.isActive } : pc
          )
        );
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

  const copyCode = (code: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      toast.success(`تم نسخ الكود: ${code}`);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  const filteredCodes = useMemo(() => {
    return promoCodes.filter((pc) => {
      const matchesSearch =
        pc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pc.description && pc.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus =
        statusFilter === ''
          ? true
          : statusFilter === 'active'
          ? pc.isActive
          : !pc.isActive;
      return matchesSearch && matchesStatus;
    });
  }, [promoCodes, searchQuery, statusFilter]);

  // Summary Metrics
  const totalCodes = promoCodes.length;
  const activeCount = promoCodes.filter((p) => p.isActive).length;
  const inactiveCount = totalCodes - activeCount;
  const totalUses = promoCodes.reduce((sum, p) => sum + (p.currentUses || 0), 0);

  return (
    <div className="space-y-6 max-w-[1100px] w-full" dir="rtl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-white leading-none">أكواد الخصم</h2>
          <p className="text-[11px] text-white/25 mt-1.5">إدارة وتتبع أكواد الخصم والعروض الترويجية</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPromoCodes(true)}
            disabled={isRefreshing || loading}
            className="flex items-center justify-center p-1.5 h-8 w-8 bg-white/[0.06] border border-white/[0.08] rounded text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-50"
            title="تحديث البيانات"
            aria-label="تحديث"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => router.push('/admin/add-promo-code')}
            className="flex items-center justify-center h-8 px-4 bg-white text-black hover:bg-white/90 rounded text-[11px] font-medium transition-colors gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة كود جديد
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-1.5">
            <span className="text-[11px]">إجمالي الأكواد</span>
            <Tag className="w-3.5 h-3.5 text-white/30" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{totalCodes}</div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-1.5">
            <span className="text-[11px]">أكواد نشطة</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400/80" />
          </div>
          <div className="text-xl font-bold text-green-400 font-mono">{activeCount}</div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-1.5">
            <span className="text-[11px]">أكواد معطلة</span>
            <AlertCircle className="w-3.5 h-3.5 text-white/30" />
          </div>
          <div className="text-xl font-bold text-white/40 font-mono">{inactiveCount}</div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/40 mb-1.5">
            <span className="text-[11px]">مرات الاستخدام</span>
            <Users className="w-3.5 h-3.5 text-amber-400/80" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">{totalUses.toLocaleString()}</div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            placeholder="بحث عن كود خصم أو وصف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 h-8 bg-white/[0.02] border border-white/[0.08] text-white text-[12px] rounded focus:border-white/20 focus:outline-none transition-all placeholder:text-white/20"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Dropdown Filter */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-between h-8 px-3 bg-white/[0.06] border border-white/[0.08] rounded text-[12px] text-white hover:bg-white/[0.1] transition-colors whitespace-nowrap min-w-[125px]">
                <span>
                  {statusFilter === ''
                    ? 'جميع الحالات'
                    : statusFilter === 'active'
                    ? 'الأكواد النشطة'
                    : 'الأكواد المعطلة'}
                </span>
                <ChevronDown className="mr-1.5 h-3.5 w-3.5 text-white/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1c1917] border-white/[0.08] shadow-xl rounded-lg min-w-[140px] text-right">
              <DropdownMenuItem
                onClick={() => setStatusFilter('')}
                className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer"
              >
                جميع الحالات
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.08]" />
              <DropdownMenuItem
                onClick={() => setStatusFilter('active')}
                className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer"
              >
                نشط فقط
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter('inactive')}
                className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer"
              >
                غير نشط فقط
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
              }`}
              title="عرض جدولي"
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
              }`}
              title="عرض بطاقات"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[35vh] border border-white/[0.04] rounded-lg bg-white/[0.01]">
          <Loader2 className="w-6 h-6 animate-spin text-white/20 mb-3" />
          <span className="text-[12px] text-white/40">جاري تحميل أكواد الخصم...</span>
        </div>
      ) : filteredCodes.length > 0 ? (
        viewMode === 'table' ? (
          /* Table View */
          <div className="overflow-x-auto rounded-lg border border-white/[0.04] bg-white/[0.02]">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/[0.04] hover:bg-transparent">
                  <TableHead className="text-white/40 font-medium text-[11px] h-9 px-3 text-right">كود الخصم</TableHead>
                  <TableHead className="text-white/40 font-medium text-[11px] h-9 px-3 text-right">قيمة الخصم</TableHead>
                  <TableHead className="text-white/40 font-medium text-[11px] h-9 px-3 text-right">الحد الأدنى</TableHead>
                  <TableHead className="text-white/40 font-medium text-[11px] h-9 px-3 text-right">الاستخدام</TableHead>
                  <TableHead className="text-white/40 font-medium text-[11px] h-9 px-3 text-right">تاريخ الانتهاء</TableHead>
                  <TableHead className="text-white/40 font-medium text-[11px] h-9 px-3 text-right">الحالة</TableHead>
                  <TableHead className="text-white/40 font-medium text-[11px] h-9 px-3 text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.map((promoCode) => {
                  const isExpired = new Date(promoCode.validUntil) < new Date();
                  return (
                    <TableRow
                      key={promoCode._id}
                      className="border-b border-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      {/* Code and Description */}
                      <TableCell className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[12px] font-bold text-white tracking-wider bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded">
                              {promoCode.code}
                            </span>
                            <button
                              onClick={() => copyCode(promoCode.code)}
                              className="p-1 rounded text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors"
                              title="نسخ الكود"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          {promoCode.description && (
                            <span
                              className="text-[10px] text-white/40 mt-1 max-w-[220px] truncate"
                              title={promoCode.description}
                            >
                              {promoCode.description}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Discount Value and Type */}
                      <TableCell className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-amber-400 font-semibold font-mono text-[12px]">
                            {promoCode.waiveShipping
                              ? 'شحن مجاني'
                              : promoCode.type === 'percentage'
                              ? `خصم ${promoCode.discount}%`
                              : `خصم ${promoCode.discount.toLocaleString()} ج.م`}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {promoCode.waiveShipping
                              ? 'إعفاء من الشحن'
                              : promoCode.type === 'percentage'
                              ? 'نسبة مئوية'
                              : 'مبلغ ثابت'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Min Order Amount */}
                      <TableCell className="py-2.5 px-3">
                        <span className="text-[11px] text-white/70 font-mono">
                          {promoCode.minAmount && promoCode.minAmount > 0
                            ? `${promoCode.minAmount.toLocaleString()} ج.م`
                            : 'بدون حد'}
                        </span>
                      </TableCell>

                      {/* Usage and Limit */}
                      <TableCell className="py-2.5 px-3">
                        <div className="flex flex-col gap-1 min-w-[90px]">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-white">{promoCode.currentUses}</span>
                            <span className="text-white/30">/ {promoCode.maxUses || '∞'}</span>
                          </div>
                          {promoCode.maxUses ? (
                            <div className="w-full bg-white/[0.06] rounded-full h-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  promoCode.currentUses >= promoCode.maxUses
                                    ? 'bg-red-400'
                                    : 'bg-amber-400/80'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    (promoCode.currentUses / promoCode.maxUses) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      </TableCell>

                      {/* Expiration Date */}
                      <TableCell className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span
                            className={`text-[11px] font-mono ${
                              isExpired ? 'text-red-400/80 line-through' : 'text-white/70'
                            }`}
                          >
                            {new Date(promoCode.validUntil).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {isExpired && (
                            <span className="text-[9px] text-red-400 font-medium">منتهي الصلاحية</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Active Status Switch */}
                      <TableCell className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={promoCode.isActive}
                            onCheckedChange={() => togglePromoCodeStatus(promoCode)}
                          />
                          <span
                            className={`text-[10px] font-medium ${
                              promoCode.isActive ? 'text-green-400' : 'text-white/40'
                            }`}
                          >
                            {promoCode.isActive ? 'نشط' : 'معطل'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Row Actions */}
                      <TableCell className="py-2.5 px-3 text-left">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditPromoCode(promoCode)}
                            className="h-7 w-7 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePromoCode(promoCode._id)}
                            className="h-7 w-7 flex items-center justify-center rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Cards Grid View (matching products.tsx aesthetic) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCodes.map((promoCode) => {
              const isExpired = new Date(promoCode.validUntil) < new Date();
              return (
                <div
                  key={promoCode._id}
                  className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3.5 transition-all hover:bg-white/[0.03] hover:border-white/[0.08] flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Code & Switch */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[13px] font-bold text-white tracking-wider bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded">
                          {promoCode.code}
                        </span>
                        <button
                          onClick={() => copyCode(promoCode.code)}
                          className="p-1 rounded text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors"
                          title="نسخ الكود"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={promoCode.isActive}
                          onCheckedChange={() => togglePromoCodeStatus(promoCode)}
                        />
                        <span
                          className={`text-[10px] font-medium ${
                            promoCode.isActive ? 'text-green-400' : 'text-white/40'
                          }`}
                        >
                          {promoCode.isActive ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                    </div>

                    {/* Discount & Description */}
                    <div className="space-y-1 mb-3">
                      <div className="text-[13px] font-semibold text-amber-400 font-mono">
                        {promoCode.waiveShipping
                          ? 'إعفاء من رسوم الشحن'
                          : promoCode.type === 'percentage'
                          ? `خصم ${promoCode.discount}%`
                          : `خصم ${promoCode.discount.toLocaleString()} ج.م`}
                      </div>
                      {promoCode.description && (
                        <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">
                          {promoCode.description}
                        </p>
                      )}
                    </div>

                    {/* Details Box */}
                    <div className="bg-white/[0.015] border border-white/[0.04] rounded-md p-2.5 space-y-2 mb-3 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-[10px]">الحد الأدنى</span>
                        <span className="font-mono text-white/70">
                          {promoCode.minAmount && promoCode.minAmount > 0
                            ? `${promoCode.minAmount.toLocaleString()} ج.م`
                            : 'بدون حد'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-[10px]">الاستخدام</span>
                        <span className="font-mono text-white/80">
                          {promoCode.currentUses} / {promoCode.maxUses || '∞'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-[10px]">صالح حتى</span>
                        <span
                          className={`font-mono ${
                            isExpired ? 'text-red-400 line-through' : 'text-white/70'
                          }`}
                        >
                          {new Date(promoCode.validUntil).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-white/[0.04]">
                    <button
                      onClick={() => handleEditPromoCode(promoCode)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-7.5 bg-white/[0.04] hover:bg-blue-500/10 text-blue-400 border border-white/[0.04] hover:border-blue-500/20 rounded text-[11px] font-medium transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeletePromoCode(promoCode._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-7.5 bg-white/[0.04] hover:bg-red-500/10 text-red-400 border border-white/[0.04] hover:border-red-500/20 rounded text-[11px] font-medium transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center min-h-[35vh] border border-white/[0.04] rounded-lg bg-white/[0.01] p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-3">
            <Tag className="w-5 h-5 text-white/20" />
          </div>
          <p className="text-[13px] font-medium text-white mb-1">
            {searchQuery || statusFilter ? 'لم يتم العثور على أكواد مطابقة' : 'لا يوجد أكواد خصم حتى الآن'}
          </p>
          <p className="text-[11px] text-white/40 mb-4 max-w-sm">
            {searchQuery || statusFilter
              ? 'جرب البحث بمصطلح آخر أو قم بإلغاء التصفية'
              : 'أنشئ أول كود خصم لتقديمه لعملائك لزيادة المبيعات'}
          </p>
          {!searchQuery && !statusFilter && (
            <button
              onClick={() => router.push('/admin/add-promo-code')}
              className="h-8 px-4 bg-white text-black hover:bg-white/90 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              إنشاء أول كود خصم
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PromoCodes;