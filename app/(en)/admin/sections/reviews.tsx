"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { IFeedback } from '@/models/feedback';
import { toast } from 'sonner';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, MessageSquare, Star, Loader2, Trash2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

// ── Helpers ───────────────────────────────────────────────────

const extractCustomerInfo = (message: string) => {
  const lines = message.split('\n');
  const info: { name?: string; email?: string; phone?: string } = {};
  lines.forEach(line => {
    if (line.startsWith('From:'))  info.name  = line.replace('From:', '').trim();
    if (line.startsWith('Email:')) info.email = line.replace('Email:', '').trim();
    if (line.startsWith('Phone:')) info.phone = line.replace('Phone:', '').trim();
  });
  return info;
};

const getCleanMessage = (message: string) =>
  message.split('\n')
    .filter(l => !l.startsWith('From:') && !l.startsWith('Email:') && !l.startsWith('Phone:'))
    .join('\n').trim();

const renderStars = (rating: number) => (
  <div className="flex items-center gap-0.5" dir="ltr">
    {[1, 2, 3, 4, 5].map(s => (
      <Star key={s} className={`w-3 h-3 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />
    ))}
  </div>
);

// ── Component ─────────────────────────────────────────────────

const Reviews = () => {
  const [reviews, setReviews] = useState<IFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  // ── Data fetching ─────────────────────────────────────────

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/feedback');
      if (res.ok) {
        const data = await res.json();
        setReviews(data.feedback || []);
      } else {
        toast.error('فشل في جلب التقييمات');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      toast.error('خطأ في جلب التقييمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // ── Toggle visibility (single toggle = approve + show) ────

  const toggleVisibility = useCallback(async (review: IFeedback) => {
    const isCurrentlyVisible = review.isApproved && review.isShownPublic;
    const newState = !isCurrentlyVisible;

    // Optimistic update
    setReviews(prev => prev.map(r =>
      r._id === review._id
        ? { ...r, isApproved: newState, isShownPublic: newState } as IFeedback
        : r
    ));

    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: review._id,
          isApproved: newState,
          isShownPublic: newState,
        }),
      });

      if (!res.ok) {
        // Revert on failure
        setReviews(prev => prev.map(r =>
          r._id === review._id
            ? { ...r, isApproved: !newState, isShownPublic: !newState } as IFeedback
            : r
        ));
        toast.error('فشل في تحديث حالة التقييم');
      } else {
        toast.success(newState ? 'تم إظهار التقييم في الموقع' : 'تم إخفاء التقييم من الموقع');
      }
    } catch (err) {
      console.error('Error toggling visibility:', err);
      setReviews(prev => prev.map(r =>
        r._id === review._id
          ? { ...r, isApproved: !newState, isShownPublic: !newState } as IFeedback
          : r
      ));
      toast.error('خطأ في تحديث حالة التقييم');
    }
  }, []);

  // ── Delete ────────────────────────────────────────────────

  const deleteReview = useCallback(async (reviewId: string) => {
    setReviews(prev => prev.filter(r => r._id !== reviewId));
    try {
      const res = await fetch(`/api/admin/feedback/${reviewId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('تم حذف التقييم بنجاح!');
      } else {
        toast.error('فشل في حذف التقييم');
        fetchReviews(); // re-fetch on failure
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      toast.error('خطأ في حذف التقييم');
      fetchReviews();
    }
  }, [fetchReviews]);

  // ── Columns ───────────────────────────────────────────────

  const columns: ColumnDef<IFeedback>[] = [
    {
      accessorKey: "_id",
      header: "رقم التقييم",
      cell: ({ row }) => (
        <div className="font-mono text-white/60 text-[11px]">
          {(row.getValue("_id") as string).slice(-8)}
        </div>
      ),
    },
    {
      id: "customerInfo",
      header: "العميل",
      cell: ({ row }) => {
        const review = row.original as IFeedback & { name?: string; email?: string; phone?: string };
        const info = review.name
          ? { name: review.name, email: review.email, phone: review.phone }
          : extractCustomerInfo(review.message);
        return (
          <div className="flex flex-col">
            <div className="text-[12px] font-medium text-white">{info.name || 'مجهول'}</div>
            {info.email && <div className="text-[10px] text-white/40">{info.email}</div>}
            {info.phone && <div className="text-[10px] text-white/40">{info.phone}</div>}
          </div>
        );
      },
    },
    {
      id: "reviewText",
      header: "نص التقييم",
      cell: ({ row }) => {
        const review = row.original as IFeedback & { name?: string };
        const msg = review.name ? review.message : getCleanMessage(review.message);
        return (
          <div className="text-[12px] text-white/80 max-w-xs truncate" title={msg}>
            {msg}
          </div>
        );
      },
    },
    {
      accessorKey: "rating",
      header: "التقييم",
      cell: ({ row }) => (
        <div className="flex justify-end">{renderStars(row.getValue("rating"))}</div>
      ),
    },
    {
      id: "visibility",
      header: "ظاهر في الموقع",
      cell: ({ row }) => {
        const review = row.original;
        const isVisible = review.isApproved && review.isShownPublic;
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={isVisible}
              onCheckedChange={() => toggleVisibility(review)}
            />
            <span className={`text-[10px] font-medium ${isVisible ? 'text-green-400' : 'text-white/40'}`}>
              {isVisible ? 'ظاهر' : 'مخفي'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "التاريخ",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <div className="text-[11px] text-white/60">
            {date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const review = row.original;
        return (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="h-7 w-7 flex items-center justify-center rounded text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#1c1917] border-white/[0.08] text-white" style={{ direction: 'rtl' }}>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-right text-lg">هل أنت متأكد تماماً؟</AlertDialogTitle>
                <AlertDialogDescription className="text-right text-white/60 text-[13px]">
                  لا يمكن التراجع عن هذا الإجراء. سيتم حذف التقييم نهائياً من قاعدة البيانات.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse sm:flex-row-reverse justify-start gap-2">
                <AlertDialogCancel className="bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:text-white text-white">إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteReview(review._id as string)}
                  className="bg-red-500 text-white hover:bg-red-600 border-none"
                >
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      },
    },
  ];

  // ── Table instance ────────────────────────────────────────

  const table = useReactTable({
    data: reviews,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
  });

  // ── Stats ─────────────────────────────────────────────────

  const totalReviews = reviews.length;
  const visibleCount = reviews.filter(r => r.isApproved && r.isShownPublic).length;
  const hiddenCount = totalReviews - visibleCount;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : '0';

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-[1100px] w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-white leading-none">التقييمات والمراجعات</h2>
          <p className="text-[11px] text-white/25 mt-1.5">التقييمات المفعّلة تظهر مباشرة في واجهة الموقع</p>
        </div>
        <button
          onClick={fetchReviews}
          disabled={loading}
          className="flex items-center justify-center p-1.5 h-8 w-8 bg-white/[0.06] border border-white/[0.08] rounded text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 flex flex-col justify-center items-center">
          <div className="text-[10px] text-white/40 mb-1">إجمالي التقييمات</div>
          <div className="text-xl font-bold text-white font-mono">{totalReviews}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 flex flex-col justify-center items-center">
          <div className="text-[10px] text-white/40 mb-1">ظاهر في الموقع</div>
          <div className="text-xl font-bold text-green-400 font-mono">{visibleCount}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 flex flex-col justify-center items-center">
          <div className="text-[10px] text-white/40 mb-1">مخفي</div>
          <div className="text-xl font-bold text-white/40 font-mono">{hiddenCount}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 flex flex-col justify-center items-center">
          <div className="text-[10px] text-white/40 mb-1">متوسط التقييم</div>
          <div className="text-xl font-bold text-amber-400 font-mono flex items-center gap-1">
            {avgRating} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Input
            placeholder="بحث في التقييمات..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full h-9 bg-white/[0.02] border-white/[0.08] text-white text-[12px] placeholder:text-white/20 rounded-lg focus-visible:ring-1 focus-visible:ring-white/20"
          />
        </div>
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button className="h-9 px-3 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-white hover:bg-white/[0.08] transition-colors whitespace-nowrap w-full sm:w-auto justify-center">
              الأعمدة <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1c1917] border-white/[0.08] text-white">
            {table.getAllColumns().filter(col => col.getCanHide()).map(col => (
              <DropdownMenuCheckboxItem
                key={col.id}
                className="capitalize text-[12px] hover:bg-white/[0.04] focus:bg-white/[0.04] focus:text-white cursor-pointer flex justify-between"
                checked={col.getIsVisible()}
                onCheckedChange={(v) => col.toggleVisibility(!!v)}
              >
                {col.id === 'customerInfo' ? 'العميل' :
                 col.id === 'reviewText' ? 'نص التقييم' :
                 col.id === 'rating' ? 'التقييم' :
                 col.id === 'visibility' ? 'الحالة' :
                 col.id === 'createdAt' ? 'التاريخ' : col.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-white/[0.04] bg-white/[0.02]">
                {hg.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 text-[11px] font-medium text-white/40 whitespace-nowrap text-right">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 align-middle text-[12px]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-white/40 text-[12px]">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-white/20" />
                      <span>جاري تحميل التقييمات...</span>
                    </div>
                  ) : "لا توجد تقييمات."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-[11px] border-t border-white/[0.04] pt-4">
        <div className="text-white/40">
          {table.getFilteredRowModel().rows.length} تقييم
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 h-8 bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08] transition-colors rounded disabled:opacity-30 flex items-center justify-center"
          >
            التالي
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 h-8 bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08] transition-colors rounded disabled:opacity-30 flex items-center justify-center"
          >
            السابق
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
