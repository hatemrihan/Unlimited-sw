'use client';

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
import { ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import ProtectedAdminRoute from '@/components/auth/protected-admin-route';
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

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const openDeleteDialog = useCallback((order: Order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  }, []);

  // Memoize columns to prevent exhaustive re-renders
  const columns = useMemo(() => getOrderColumns(openDeleteDialog), [openDeleteDialog]);

  // Load persistence — SSR guard required (localStorage is browser-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedState = localStorage.getItem('orders-table-state');
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

  // Save persistence — skip on initial mount defaults to avoid overwriting saved state
  const isMountedRef = React.useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) { isMountedRef.current = true; return; }
    if (typeof window === 'undefined') return;
    localStorage.setItem('orders-table-state', JSON.stringify({ sorting, columnVisibility }));
  }, [sorting, columnVisibility]);

  // Initialize table
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

  // Remove nested ProtectedAdminRoute — parent AdminDashboard already wraps with it
  return (
    <div className="bg-white text-gray-900 min-h-screen p-6 relative">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl tracking-tight font-bold text-gray-900 mb-1">Orders Management</h1>
          <p className="text-gray-500 text-sm">Manage and track all customer orders</p>
        </div>

        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row items-center py-4 gap-4">
          <Input
            placeholder="Filter by customer name, order ID, or email..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full sm:max-w-sm border-gray-200"
          />

          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting} className="flex-1 sm:flex-none text-gray-700 bg-white border-gray-300 hover:bg-gray-50 font-medium tracking-wide">
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? 'Exporting...' : 'Export As'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border-gray-200 shadow-xl rounded-lg">
                <DropdownMenuLabel className="text-gray-900 font-bold px-3 py-2">Export Options</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport(exportOrdersAsCSV)} className="text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer px-3 py-2 rounded-sm transition-colors">
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport(exportOrdersAsExcel)} className="text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer px-3 py-2 rounded-sm transition-colors">
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport(exportOrdersAsPDF)} className="text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer px-3 py-2 rounded-sm transition-colors">
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport(exportOrdersAsJSON)} className="text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer px-3 py-2 rounded-sm transition-colors">
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-100 my-1" />
                <DropdownMenuItem className="text-gray-400 font-medium text-xs italic pointer-events-none px-3 py-2">
                  {table.getFilteredSelectedRowModel().rows.length > 0
                    ? `Exporting ${table.getFilteredSelectedRowModel().rows.length} selected lines`
                    : `Exporting all ${table.getFilteredRowModel().rows.length} lines`
                  }
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Config Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none text-gray-700 bg-white border-gray-300 hover:bg-gray-50 font-medium tracking-wide">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white shadow-xl border-gray-200 rounded-lg p-1">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer rounded-sm py-2 px-3"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data Table */}
        {loadingOrders ? (
          <div className="bg-white border border-gray-200 rounded-lg p-16 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 border-t-2 border-l-2 border-transparent"></div>
              <span className="text-gray-500 font-medium animate-pulse tracking-wide">Loading secure order index...</span>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} className="text-gray-600 font-semibold tracking-wide py-4">
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
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-4">
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
                      className="h-32 text-center text-gray-500 font-medium tracking-wide"
                    >
                      No orders found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center justify-between gap-2 py-4 px-2">
          <div className="text-sm font-medium text-gray-500">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Next
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteDialogOpen && orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">Delete Order</h3>
              <p className="text-gray-600 text-sm mb-8 leading-relaxed">
                Are you sure you want to completely erase the order for <span className="font-bold text-gray-900">"{orderToDelete.customer.name}"</span>? This action is permanent and cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setOrderToDelete(null);
                  }}
                  className="text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:bg-gray-50 font-semibold tracking-wide py-2 px-5 h-auto transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
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
                      // Always reset — prevents button staying stuck on network error
                      setIsDeleting(false);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold tracking-wide py-2 px-5 h-auto shadow-sm transition-all focus:ring-4 focus:ring-red-100"
                >
                  {isDeleting ? 'Erasing...' : 'Delete Immediately'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default Orders;
