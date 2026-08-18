"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
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

import { useOrders, Order, OrderStatus } from '@/hooks/useOrders';
import { orderService } from '@/services/orderService';
import { exportOrdersAsCSV, exportOrdersAsExcel, exportOrdersAsJSON, exportOrdersAsPDF } from '@/utils/exportOrders';
import { getOrderColumns, ORDER_STATUSES, statusLabel } from '@/components/orders/OrderColumns';
import { useDebounce } from '@/hooks/useDebounce';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

const COLUMN_LABELS: Record<string, string> = {
  customer_name: 'العميل',
  orderId: 'رقم الطلب',
  status: 'الحالة',
  customer_email: 'البريد الإلكتروني',
  customer_phone: 'رقم الهاتف',
  customer_address: 'العنوان',
  products: 'المنتجات',
  color: 'اللون',
  paymentMethod: 'طريقة الدفع',
  promoCode: 'كود الخصم',
  transactionScreenshot: 'الإيصال',
  totalAmount: 'الإجمالي',
  orderDate: 'التاريخ',
};

/** Server-side sortable columns, mirroring listOrdersQuerySchema. */
const SORTABLE_COLUMNS: Record<string, string> = {
  orderDate: 'orderDate',
  totalAmount: 'totalAmount',
  status: 'status',
  customer_name: 'createdAt', // no index on name; fall back to the default order
};

/** A hard ceiling on an export, so one click cannot pull a hundred thousand rows. */
const MAX_EXPORT_ROWS = 5000;
const EXPORT_PAGE_SIZE = 100;

/** What changing status does to inventory, said plainly before it happens. */
function statusChangeWarning(order: Order, next: OrderStatus): string | null {
  if (next === 'cancelled' && order.status !== 'cancelled') {
    return 'هيتم إرجاع كل المنتجات دي للمخزون، ولو الطلب استخدم كود خصم هيرجع رصيد الكود كمان.';
  }
  if (next !== 'cancelled' && order.status === 'cancelled') {
    return 'هيتم حجز المنتجات دي من المخزون تاني. لو الكمية مش متاحة دلوقتي، التغيير هيترفض.';
  }
  return null;
}

const Orders = () => {
  const {
    orders,
    loadingOrders,
    totalPages,
    totalCount,
    updatingOrderId,
    fetchOrders,
    updateOrderStatus,
    deleteOrder,
  } = useOrders();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const debouncedGlobalFilter = useDebounce(globalFilter, 300);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<
    { order: Order; next: OrderStatus } | null
  >(null);

  const openDeleteDialog = useCallback((order: Order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * Cancelling and un-cancelling move real inventory, so they are confirmed
   * first. Every other transition is routine and applies immediately.
   */
  const requestStatusChange = useCallback((order: Order, next: OrderStatus) => {
    if (next === order.status) return;

    if (statusChangeWarning(order, next)) {
      setPendingStatusChange({ order, next });
      return;
    }

    void updateOrderStatus(order._id, next);
  }, [updateOrderStatus]);

  const columns = useMemo(
    () => getOrderColumns({ openDeleteDialog, requestStatusChange, updatingOrderId }),
    [openDeleteDialog, requestStatusChange, updatingOrderId]
  );

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

  // Searching or filtering from page 4 must not leave you on page 4 of a much
  // shorter result set, staring at an empty table. The selection is dropped at
  // the same time: rows picked out of the previous result set are not what
  // "export selected" should mean once the results have changed underneath.
  useEffect(() => {
    setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
    setRowSelection({});
  }, [debouncedGlobalFilter, statusFilter]);

  /** The query the server is being asked for — one place, reused by export. */
  const query = useMemo(() => ({
    search: debouncedGlobalFilter || undefined,
    status: statusFilter || undefined,
    sortBy: sorting[0] ? SORTABLE_COLUMNS[sorting[0].id] : undefined,
    sortDir: sorting[0] ? (sorting[0].desc ? 'desc' as const : 'asc' as const) : undefined,
  }), [debouncedGlobalFilter, statusFilter, sorting]);

  const table = useReactTable({
    data: orders,
    columns,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    // Identify rows by the ORDER, not by their position in the page.
    //
    // TanStack defaults to the row index, and with server-side pagination every
    // page is indexed 0…49. So selecting the first row on page 1 and moving to
    // page 2 left the first row THERE marked as selected, and an export of "the
    // selected rows" wrote out orders the admin had never picked. Silent, and
    // wrong in a file someone does their accounting from.
    getRowId: row => row._id,
    // Filtering, sorting and paging ALL happen in the database now. They used to
    // run in the browser over the 50 rows already on screen, so a search for a
    // customer on page 3 reported "no orders match" — a confident wrong answer.
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    pageCount: totalPages,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      globalFilter: debouncedGlobalFilter,
      pagination: { pageIndex, pageSize },
    },
  });

  const reload = useCallback((signal?: AbortSignal) => {
    return fetchOrders(signal, { page: pageIndex + 1, limit: pageSize, ...query });
  }, [fetchOrders, pageIndex, pageSize, query]);

  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  /**
   * Pulls every order matching the current search and filter, page by page.
   *
   * The export used to hand `exportFn` whatever was on screen while the label
   * said "exporting all N rows" — so with 4,000 orders in the database it
   * produced a 50-row file and looked like a complete one.
   */
  const fetchAllMatching = useCallback(async (): Promise<Order[]> => {
    const collected: Order[] = [];
    let page = 1;

    while (collected.length < MAX_EXPORT_ROWS) {
      const batch = await orderService.getOrders(undefined, {
        page,
        limit: EXPORT_PAGE_SIZE,
        ...query,
      });

      collected.push(...batch.orders);

      if (batch.orders.length < EXPORT_PAGE_SIZE || page >= batch.totalPages) break;
      page += 1;
    }

    if (collected.length >= MAX_EXPORT_ROWS) {
      toast.warning(`تم تصدير أول ${MAX_EXPORT_ROWS} طلب فقط. ضيّق البحث لو محتاج باقي الطلبات.`);
    }

    return collected;
  }, [query]);

  const selectedCount = table.getSelectedRowModel().rows.length;

  const handleExport = async (exportFn: (orders: Order[]) => void | Promise<void>) => {
    try {
      setIsExporting(true);

      // An explicit selection means exactly that selection. Otherwise it means
      // everything the current search matches — from the server, not the page.
      const selectedRows = table.getSelectedRowModel().rows;
      const rowsToExport = selectedRows.length > 0
        ? selectedRows.map(r => r.original)
        : await fetchAllMatching();

      if (rowsToExport.length === 0) {
        toast.error('مفيش طلبات للتصدير.');
        return;
      }

      await exportFn(rowsToExport);
    } catch (error) {
      logger.error('[Orders] Export failed', error);
      toast.error('فشل التصدير. جرب تاني.');
    } finally {
      setIsExporting(false);
    }
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    const { order, next } = pendingStatusChange;

    const result = await updateOrderStatus(order._id, next);
    setPendingStatusChange(null);

    // A conflict means inventory or a promo code moved while this page was open.
    // Reload so the admin is looking at what is actually true.
    if (!result.ok && result.isConflict) {
      await reload();
    }
  };

  const exportScopeLabel = selectedCount > 0
    ? `يتم تصدير ${selectedCount} صف محدد`
    : `يتم تصدير كل الطلبات المطابقة (${totalCount})`;

  return (
    <div className="space-y-6 max-w-[1100px] w-full" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-white leading-none">إدارة الطلبات</h2>
          <p className="text-[11px] text-white/25 mt-1.5">
            {loadingOrders ? 'جاري التحميل…' : `${totalCount} طلب`} · تتبع وإدارة وتصدير جميع طلبات العملاء
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh Button */}
          <button
            onClick={() => reload()}
            disabled={loadingOrders}
            className="flex items-center justify-center p-1.5 h-8 w-8 bg-white/[0.06] border border-white/[0.08] rounded text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors disabled:opacity-40"
            aria-label="تحديث"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
          </button>

          {/* Search — runs against the whole database, not the loaded page */}
          <Input
            placeholder="ابحث بالاسم أو رقم الطلب أو الهاتف أو البريد..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full sm:w-[280px] bg-white/[0.02] border-white/[0.06] text-white placeholder:text-white/20 text-[12px] h-8 rounded"
          />

          {/* Status filter */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center h-8 px-3 bg-white/[0.06] border border-white/[0.08] rounded text-[12px] text-white hover:bg-white/[0.1] transition-colors whitespace-nowrap">
                {statusFilter ? statusLabel(statusFilter) : 'كل الحالات'}
                <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1c1917] border-white/[0.08] shadow-xl rounded-lg min-w-[150px]">
              <DropdownMenuItem
                onClick={() => setStatusFilter('')}
                className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer"
              >
                كل الحالات
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.08]" />
              {ORDER_STATUSES.map(status => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => setStatusFilter(status.value)}
                  className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer"
                >
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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
                {exportScopeLabel}
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
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer rounded-sm py-2 px-3 border-none transition-colors flex justify-end"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {COLUMN_LABELS[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
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
        <div className="overflow-x-auto rounded-lg border border-white/[0.04] bg-white/[0.02]">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-white/[0.04] hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-white/40 font-medium text-[11px] h-9 px-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
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
                    {debouncedGlobalFilter || statusFilter
                      ? 'لا توجد طلبات مطابقة للبحث في كل الطلبات.'
                      : 'لا توجد طلبات بعد.'}
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
          صفحة {pageIndex + 1} من {Math.max(1, totalPages)}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
            disabled={pageIndex === 0 || loadingOrders}
            className="px-3 h-8 rounded bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
          >
            السابق
          </button>
          <button
            onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
            disabled={pageIndex + 1 >= totalPages || loadingOrders}
            className="px-3 h-8 rounded bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
          >
            التالي
          </button>
        </div>
      </div>

      {/* Status Change Confirmation */}
      {pendingStatusChange && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-[#1c1917] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-[16px] font-semibold text-white mb-2">
              تغيير حالة الطلب إلى &quot;{statusLabel(pendingStatusChange.next)}&quot;
            </h3>
            <p className="text-[13px] text-white/60 mb-2 leading-relaxed">
              طلب العميل <span className="font-bold text-white">{pendingStatusChange.order.customer.name}</span> ({pendingStatusChange.order.orderId}).
            </p>
            <p className="text-[13px] text-amber-300/90 mb-6 leading-relaxed">
              {statusChangeWarning(pendingStatusChange.order, pendingStatusChange.next)}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingStatusChange(null)}
                className="px-4 py-2 bg-white/[0.06] border border-white/[0.08] text-[12px] font-medium text-white rounded hover:bg-white/[0.1] transition-colors"
              >
                إلغاء
              </button>
              <button
                disabled={updatingOrderId === pendingStatusChange.order._id}
                onClick={confirmStatusChange}
                className="px-4 py-2 bg-white/[0.1] border border-white/[0.12] text-[12px] font-medium text-white rounded hover:bg-white/[0.16] transition-colors disabled:opacity-50"
              >
                {updatingOrderId === pendingStatusChange.order._id ? 'جاري التغيير...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && orderToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-[#1c1917] border border-white/[0.08] rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-[16px] font-semibold text-white mb-2">حذف الطلب</h3>
            <p className="text-[13px] text-white/60 mb-3 leading-relaxed">
              هل أنت متأكد من حذف طلب العميل <span className="font-bold text-white">&quot;{orderToDelete.customer.name}&quot;</span>؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.
            </p>
            {/* The one consequence the admin most needs to know before pressing it. */}
            <p className="text-[13px] text-amber-300/90 mb-3 leading-relaxed">
              {orderToDelete.status === 'cancelled'
                ? 'الطلب ده ملغي، فالمخزون رجع بالفعل. الحذف هيمسح السجل نهائياً.'
                : 'هيتم إرجاع كل المنتجات للمخزون، ولو الطلب استخدم كود خصم هيرجع رصيد الكود كمان.'}
            </p>
            <p className="text-[12px] text-white/40 mb-6 leading-relaxed">
              لو العميل بس لغى الطلب، الأفضل تغيّر حالته إلى &quot;ملغي&quot; بدل الحذف — كده المخزون يرجع والسجل يفضل موجود.
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
                      await reload();
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
