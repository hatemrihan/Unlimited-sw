"use client";

import React, { useState, useEffect } from 'react';
import { IFeedback } from '../../../models/feedback';
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
import { ChevronDown, MoreHorizontal, MessageSquare, Star, Loader2, Check, X, Copy, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

const Reviews = () => {
  const [reviews, setReviews] = useState<IFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/feedback');
      if (response.ok) {
        const data = await response.json();
        setReviews(data.feedback || []);
      } else {
        toast.error('فشل في جلب التقييمات');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('خطأ في جلب التقييمات');
    } finally {
      setLoading(false);
    }
  };

  const toggleApprovalStatus = async (review: IFeedback) => {
    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: review._id,
          isApproved: !review.isApproved
        }),
      });

      if (response.ok) {
        setReviews(reviews.map(r =>
          r._id === review._id
            ? { ...r, isApproved: !r.isApproved } as IFeedback
            : r
        ));
        toast.success(`تم ${!review.isApproved ? 'اعتماد' : 'رفض'} التقييم بنجاح!`);
      } else {
        toast.error('فشل في تحديث حالة التقييم');
      }
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error('خطأ في تحديث حالة التقييم');
    }
  };

  const toggleShowStatus = async (review: IFeedback) => {
    try {
      const currentShowStatus = (review as IFeedback & { isShownPublic?: boolean }).isShownPublic;
      const newShowStatus = !currentShowStatus;
      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: review._id,
          isShownPublic: newShowStatus
        }),
      });

      if (response.ok) {
        setReviews(reviews.map(r =>
          r._id === review._id
            ? { ...r, isShownPublic: newShowStatus } as IFeedback
            : r
        ));
        toast.success(`تم ${newShowStatus ? 'إظهار' : 'إخفاء'} التقييم للعامة بنجاح!`);
      } else {
        toast.error('فشل في تحديث حالة العرض');
      }
    } catch (error) {
      console.error('Error updating review visibility:', error);
      toast.error('خطأ في تحديث حالة العرض');
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/admin/feedback/${reviewId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReviews(reviews.filter(review => review._id !== reviewId));
        toast.success('تم حذف التقييم بنجاح!');
      } else {
        toast.error('فشل في حذف التقييم');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('خطأ في حذف التقييم');
    }
  };

  const extractCustomerInfo = (message: string) => {
    const lines = message.split('\n');
    const customerInfo: { name?: string; email?: string; phone?: string } = {};

    lines.forEach(line => {
      if (line.startsWith('From:')) {
        customerInfo.name = line.replace('From:', '').trim();
      } else if (line.startsWith('Email:')) {
        customerInfo.email = line.replace('Email:', '').trim();
      } else if (line.startsWith('Phone:')) {
        customerInfo.phone = line.replace('Phone:', '').trim();
      }
    });

    return customerInfo;
  };

  const getCleanMessage = (message: string) => {
    const lines = message.split('\n');
    return lines.filter(line =>
      !line.startsWith('From:') &&
      !line.startsWith('Email:') &&
      !line.startsWith('Phone:')
    ).join('\n').trim();
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`}
          />
        ))}
      </div>
    );
  };

  const columns: ColumnDef<IFeedback>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="تحديد الكل"
          className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="تحديد الصف"
          className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "_id",
      header: "رقم التقييم",
      cell: ({ row }) => (
        <div className="font-mono text-white/60 text-[11px]">{(row.getValue("_id") as string).slice(-8)}</div>
      ),
    },
    {
      accessorKey: "customerInfo",
      header: "العميل",
      cell: ({ row }) => {
        const review = row.original as IFeedback & { name?: string; email?: string; phone?: string };
        const customerInfo = review.name
          ? { name: review.name, email: review.email, phone: review.phone }
          : extractCustomerInfo(row.original.message);
        return (
          <div className="flex flex-col">
            <div className="text-[12px] font-medium text-white">{customerInfo.name || 'مجهول'}</div>
            {customerInfo.email && (
              <div className="text-[10px] text-white/40">{customerInfo.email}</div>
            )}
            {customerInfo.phone && (
              <div className="text-[10px] text-white/40">{customerInfo.phone}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "reviewText",
      header: "نص التقييم",
      cell: ({ row }) => {
        const review = row.original as IFeedback & { name?: string };
        const displayMessage = review.name ? row.original.message : getCleanMessage(row.original.message);
        return (
          <div className="text-[12px] text-white/80 max-w-xs truncate" title={displayMessage}>
            {displayMessage}
          </div>
        );
      },
    },
    {
      accessorKey: "rating",
      header: "التقييم",
      cell: ({ row }) => (
        <div className="flex justify-end">
          {renderStars(row.getValue("rating"))}
        </div>
      ),
    },
    {
      accessorKey: "isApproved",
      header: "الحالة",
      cell: ({ row }) => {
        const isApproved = row.getValue("isApproved");
        return (
          <span className={`inline-flex px-2 py-0.5 text-[10px] rounded border font-medium ${isApproved ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
            {isApproved ? 'معتمد' : 'قيد الانتظار'}
          </span>
        );
      },
    },
    {
      accessorKey: "isShownPublic",
      header: "العرض",
      cell: ({ row }) => {
        const review = row.original;
        const isShownPublic = (review as IFeedback & { isShownPublic?: boolean }).isShownPublic;
        return (
          <button
            onClick={() => toggleShowStatus(review)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isShownPublic ? 'bg-blue-500' : 'bg-white/20'}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isShownPublic ? '-translate-x-5' : '-translate-x-1'}`}
            />
          </button>
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
            {date.toLocaleDateString('ar-EG', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
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
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 flex items-center justify-center rounded text-white/60 hover:bg-white/[0.08] hover:text-white transition-colors mr-auto">
                <span className="sr-only">فتح القائمة</span>
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-[#1c1917] border-white/[0.08] text-white">
              <DropdownMenuLabel className="text-[11px] text-white/40">الإجراءات</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => toggleApprovalStatus(review)}
                className="text-[12px] hover:bg-white/[0.04] focus:bg-white/[0.04] focus:text-white cursor-pointer"
              >
                {review.isApproved ? <X className="w-3.5 h-3.5 ml-2 text-amber-400" /> : <Check className="w-3.5 h-3.5 ml-2 text-green-400" />}
                {review.isApproved ? 'رفض التقييم' : 'اعتماد التقييم'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleShowStatus(review)}
                className="text-[12px] hover:bg-white/[0.04] focus:bg-white/[0.04] focus:text-white cursor-pointer"
              >
                {((review as IFeedback & { isShownPublic?: boolean }).isShownPublic) ? <EyeOff className="w-3.5 h-3.5 ml-2 text-white/60" /> : <Eye className="w-3.5 h-3.5 ml-2 text-blue-400" />}
                {((review as IFeedback & { isShownPublic?: boolean }).isShownPublic) ? 'إخفاء من العامة' : 'إظهار للعامة'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(getCleanMessage(review.message as string));
                  toast.success('تم نسخ نص التقييم');
                }}
                className="text-[12px] hover:bg-white/[0.04] focus:bg-white/[0.04] focus:text-white cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 ml-2" />
                نسخ نص التقييم
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.08]" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-[12px] text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 ml-2" />
                    حذف التقييم
                  </DropdownMenuItem>
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
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  return (
    <div className="space-y-6 max-w-[1100px] w-full" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-white leading-none">التقييمات والمراجعات</h2>
          <p className="text-[11px] text-white/25 mt-1.5">إدارة تقييمات وآراء العملاء</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="flex items-center justify-center p-1.5 h-8 w-8 bg-white/[0.06] border border-white/[0.08] rounded text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 flex flex-col justify-center items-center">
          <div className="text-[10px] text-white/40 mb-1">إجمالي التقييمات</div>
          <div className="text-xl font-bold text-white font-mono">{reviews.length}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 flex flex-col justify-center items-center">
          <div className="text-[10px] text-white/40 mb-1">تم الاعتماد</div>
          <div className="text-xl font-bold text-green-400 font-mono">
            {reviews.filter(r => r.isApproved).length}
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 flex flex-col justify-center items-center">
          <div className="text-[10px] text-white/40 mb-1">قيد الانتظار</div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {reviews.filter(r => !r.isApproved).length}
          </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 flex flex-col justify-center items-center">
          <div className="text-[10px] text-white/40 mb-1">معروض للعامة</div>
          <div className="text-xl font-bold text-blue-400 font-mono">
            {reviews.filter(r => (r as IFeedback & { isShownPublic?: boolean }).isShownPublic).length}
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Input
            placeholder="بحث في التقييمات..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
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
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize text-[12px] hover:bg-white/[0.04] focus:bg-white/[0.04] focus:text-white cursor-pointer flex justify-between"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id === 'customerInfo' ? 'العميل' :
                     column.id === 'reviewText' ? 'نص التقييم' :
                     column.id === 'rating' ? 'التقييم' :
                     column.id === 'isApproved' ? 'الحالة' :
                     column.id === 'isShownPublic' ? 'العرض' :
                     column.id === 'createdAt' ? 'التاريخ' : column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/[0.04] bg-white/[0.02]">
                {headerGroup.headers.map((header) => {
                  return (
                    <th key={header.id} className="px-4 py-3 text-[11px] font-medium text-white/40 whitespace-nowrap text-right">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-white/[0.02] transition-colors ${row.getIsSelected() ? 'bg-white/[0.04]' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle text-[12px]">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-white/40 text-[12px]"
                >
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
          تم تحديد {table.getFilteredSelectedRowModel().rows.length} من أصل{" "}
          {table.getFilteredRowModel().rows.length} صفوف.
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
    </div >
  );
};

export default Reviews;
