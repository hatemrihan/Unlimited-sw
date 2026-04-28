"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  PaginationState,
} from "@tanstack/react-table";
import { ChevronDown, Download, Loader2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useOrders, Order } from '@/hooks/useOrders';
import { exportOrdersAsCSV, exportOrdersAsExcel, exportOrdersAsJSON, exportOrdersAsPDF } from '@/utils/exportOrders';
import { getOrderColumns } from '@/components/orders/OrderColumns';
import { useDebounce } from '@/hooks/useDebounce';
import { logger } from '@/utils/logger';

const Orders = () => {
  const { orders, loadingOrders, totalPages, fetchOrders, deleteOrder } = useOrders();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const debouncedGlobalFilter = useDebounce(globalFilter, 300);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const openDeleteDialog = useCallback((order: Order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  }, []);

  const columns = useMemo(() => getOrderColumns(openDeleteDialog), [openDeleteDialog]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedState = localStorage.getItem('orders-table-state-v2');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.sorting) setSorting(parsed.sorting);
        if (parsed.columnVisibility) setColumnVisibility(parsed.columnVisibility);
      } catch (e) {
        logger.warn('Failed to parse table state', e);
      }
    }
  }, []);

  const isMountedRef = React.useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) { isMountedRef.current = true; return; }
    if (typeof window === 'undefined') return;
    localStorage.setItem('orders-table-state-v2', JSON.stringify({ sorting, columnVisibility }));
  }, [sorting, columnVisibility]);

  const table = useReactTable({
    data: orders,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: 'includesString',
    manualPagination: true,
    pageCount: totalPages,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: debouncedGlobalFilter,
      pagination: { pageIndex, pageSize },
    },
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(controller.signal, pageIndex + 1, pageSize);
    return () => controller.abort();
  }, [fetchOrders, pageIndex, pageSize]);

  const handleExport = async (exportFn: (orders: Order[]) => void | Promise<void>) => {
    try {
      setIsExporting(true);
      const selectedRows = table.getFilteredSelectedRowModel().rows;
      const rowsToExport = selectedRows.length > 0 ? selectedRows : table.getFilteredRowModel().rows;
      await exportFn(rowsToExport.map(r => r.original));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1100px] w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-white leading-none">إدارة الطلبات</h2>
          <p className="text-[11px] text-white/25 mt-1.5">تتبع وإدارة وتصدير جميع طلبات العملاء</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => fetchOrders(undefined, pageIndex + 1, pageSize)}
            className="flex items-center justify-center p-1.5 h-8 w-8 bg-white/[0.06] border border-white/[0.08] rounded text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {/* Search */}
          <Input
            placeholder="ابحث باسم العميل أو رقم الطلب..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full sm:w-[250px] bg-white/[0.02] border-white/[0.06] text-white placeholder:text-white/20 text-[12px] h-8 rounded"
          />

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button disabled={isExporting} className="flex items-center justify-center h-8 px-3 bg-white/[0.06] border border-white/[0.08] rounded text-[12px] text-white hover:bg-white/[0.1] transition-colors disabled:opacity-50 whitespace-nowrap">
                <Download className="ml-1.5 h-3.5 w-3.5" />
                {isExporting ? 'جاري التصدير...' : 'تصدير'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1c1917] border-white/[0.08] shadow-xl rounded-lg min-w-[180px]">
              <DropdownMenuLabel className="text-white/60 text-[11px] px-3 py-2">خيارات التصدير</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleExport(exportOrdersAsCSV)} className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer px-3 py-2 rounded-sm border-none transition-colors">
                تصدير بصيغة CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(exportOrdersAsExcel)} className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer px-3 py-2 rounded-sm border-none transition-colors">
                تصدير بصيغة Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(exportOrdersAsPDF)} className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer px-3 py-2 rounded-sm border-none transition-colors">
                تصدير بصيغة PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(exportOrdersAsJSON)} className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer px-3 py-2 rounded-sm border-none transition-colors">
                تصدير بصيغة JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.08] my-1" />
              <div className="text-white/30 text-[10px] italic px-3 py-2 pointer-events-none">
                {table.getFilteredSelectedRowModel().rows.length > 0
                  ? `يتم تصدير ${table.getFilteredSelectedRowModel().rows.length} صف محدد`
                  : `يتم تصدير كل الـ ${table.getFilteredRowModel().rows.length} صفوف`
                }
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Config Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center h-8 px-3 bg-white/[0.06] border border-white/[0.08] rounded text-[12px] text-white hover:bg-white/[0.1] transition-colors whitespace-nowrap">
                الأعمدة <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1c1917] border-white/[0.08] shadow-xl rounded-lg p-1 min-w-[150px]">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer rounded-sm py-2 px-3 border-none transition-colors flex justify-end"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id === 'customer_name' ? 'العميل' : 
                       column.id === 'orderId' ? 'رقم الطلب' :
                       column.id === 'customer_email' ? 'البريد الإلكتروني' :
                       column.id === 'customer_phone' ? 'رقم الهاتف' :
                       column.id === 'customer_address' ? 'العنوان' :
                       column.id === 'products' ? 'المنتجات' :
                       column.id === 'color' ? 'اللون' :
                       column.id === 'paymentMethod' ? 'طريقة الدفع' :
                       column.id === 'promoCode' ? 'كود الخصم' :
                       column.id === 'transactionScreenshot' ? 'الإيصال' :
                       column.id === 'totalAmount' ? 'الإجمالي' :
                       column.id === 'orderDate' ? 'التاريخ' : column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Data Table */}
      {loadingOrders ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border border-white/[0.04] rounded-lg bg-white/[0.01]">
          <Loader2 className="h-6 w-6 animate-spin text-white/20 mb-3" />
          <span className="text-[12px] text-white/40">جاري تحميل الطلبات...</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.04] bg-white/[0.02]">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-white/[0.04] hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="text-white/40 font-medium text-[11px] h-9 px-3">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-b border-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5 px-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-[12px] text-white/40"
                  >
                    لا توجد طلبات مطابقة للبحث.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <div className="text-white/40 font-medium">
          صفحة {table.getState().pagination.pageIndex + 1} من {Math.max(1, table.getPageCount())}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 h-8 rounded bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
          >
            السابق
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 h-8 rounded bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
          >
            التالي
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && orderToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-[#1c1917] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-[16px] font-semibold text-white mb-2">حذف الطلب</h3>
            <p className="text-[13px] text-white/60 mb-6 leading-relaxed">
              هل أنت متأكد من حذف طلب العميل <span className="font-bold text-white">"{orderToDelete.customer.name}"</span>؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setOrderToDelete(null);
                }}
                className="px-4 py-2 bg-white/[0.06] border border-white/[0.08] text-[12px] font-medium text-white rounded hover:bg-white/[0.1] transition-colors"
              >
                إلغاء
              </button>
              <button
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const success = await deleteOrder(orderToDelete._id);
                    if (success) {
                      setDeleteDialogOpen(false);
                      setOrderToDelete(null);
                    }
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-[12px] font-medium text-red-400 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
