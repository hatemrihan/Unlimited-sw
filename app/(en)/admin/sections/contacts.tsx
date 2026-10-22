'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { MoreHorizontal, Loader2, MessageSquare, CheckCircle, MailOpen, Mail, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { contactService } from '@/services/contactService';
import { handleApiError } from '@/utils/handleApiError';
import { useDebounce } from '@/hooks/useDebounce';
import { logger } from '@/utils/logger';

interface Contact {
    _id: string;
    name: string;
    email: string;
    status: 'new' | 'read' | 'replied';
    createdAt: string;
}

const Contacts = () => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState({});
    const [globalFilter, setGlobalFilter] = useState("");
    const debouncedGlobalFilter = useDebounce(globalFilter, 300);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
    const [totalPages, setTotalPages] = useState(1);

    const columns = React.useMemo<ColumnDef<Contact>[]>(() => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
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
            accessorKey: "name",
            header: "الاسم",
            cell: ({ row }) => <div className="font-medium text-[12px] text-white">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "email",
            header: "البريد الإلكتروني",
            cell: ({ row }) => <div className="text-[12px] text-white/80">{row.getValue("email")}</div>,
        },
        {
            accessorKey: "status",
            header: "الحالة",
            cell: ({ row }) => {
                const status = row.getValue("status") as Contact['status'];
                
                let StatusIcon = MessageSquare;
                let statusClasses = 'bg-white/10 text-white border-white/20';
                let statusText = 'غير معروف';

                if (status === 'new') {
                    StatusIcon = MessageSquare;
                    statusClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                    statusText = 'جديد';
                } else if (status === 'read') {
                    StatusIcon = MailOpen;
                    statusClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    statusText = 'مقروء';
                } else if (status === 'replied') {
                    StatusIcon = CheckCircle;
                    statusClasses = 'bg-green-500/10 text-green-400 border-green-500/20';
                    statusText = 'تم الرد';
                }

                return (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] rounded border font-medium ${statusClasses}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusText}
                    </span>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: "التاريخ",
            cell: ({ row }) => {
                const rawDate = row.getValue("createdAt");
                const date = rawDate ? new Date(rawDate as string) : null;
                return (
                    <div className="text-[11px] text-white/60">
                        {date && !isNaN(date.getTime()) ? date.toLocaleDateString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        }) : "-"}
                    </div>
                );
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const contact = row.original;
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
                            <DropdownMenuItem onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(contact.email);
                                    toast.success("تم نسخ البريد الإلكتروني");
                                } catch {
                                    toast.error("فشل في النسخ");
                                }
                            }} className="text-[12px] hover:bg-white/[0.04] focus:bg-white/[0.04] focus:text-white cursor-pointer">
                                <Copy className="w-3.5 h-3.5 ml-2" />
                                نسخ البريد الإلكتروني
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/[0.08]" />
                            <DropdownMenuItem onClick={() => window.location.href = `mailto:${contact.email}`} className="text-[12px] text-blue-400 hover:bg-blue-500/10 focus:bg-blue-500/10 focus:text-blue-400 cursor-pointer font-medium">
                                <Mail className="w-3.5 h-3.5 ml-2" />
                                الرد عبر البريد
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ], []);

    // Load persistence
    useEffect(() => {
        const savedState = localStorage.getItem('contacts-table-state');
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

    // Save persistence
    useEffect(() => {
        localStorage.setItem('contacts-table-state', JSON.stringify({ sorting, columnVisibility }));
    }, [sorting, columnVisibility]);

    const fetchContacts = useCallback(async (signal?: AbortSignal, page = 1, limit = 20, search = "") => {
        try {
            setLoading(true);
            const data: any = await contactService.getContacts(signal, page, limit, search);
            
            // Simulating Server Side paginated payload mapping given theoretical API specs:
            if (Array.isArray(data)) {
                setContacts(data);
                setTotalPages(1);
            } else {
                setContacts(data.contacts || []);
                setTotalPages(data.totalPages || 1);
            }
        } catch (error: any) {
            // Intentional abort on unmount/navigation — never surface these to the user
            if (error?.name === 'AbortError') return;
            handleApiError(error, 'Failed to load contacts natively');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchContacts(controller.signal, pagination.pageIndex + 1, pagination.pageSize, debouncedGlobalFilter);
        return () => controller.abort();
    }, [fetchContacts, pagination.pageIndex, pagination.pageSize, debouncedGlobalFilter]);

    const table = useReactTable({
        data: contacts,
        columns,
        pageCount: totalPages,
        manualPagination: true,
        onPaginationChange: setPagination,
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
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination,
            globalFilter: debouncedGlobalFilter,
        },
    });

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" dir="rtl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white mb-1">طلبات التواصل</h2>
                    <p className="text-sm text-white/60">مراجعة استفسارات العملاء وتذاكر الدعم الفني.</p>
                </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden backdrop-blur-xl">
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-4">
                    <div className="relative w-full max-w-sm">
                        <Input
                            placeholder="ابحث عن طريق الاسم، البريد، أو الحالة..."
                            value={globalFilter ?? ""}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="bg-black/20 border-white/[0.08] text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-white/20 h-9 text-[13px]"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead>
                            <tr className="border-b border-white/[0.08] bg-black/20">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <React.Fragment key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <th key={header.id} className="h-10 px-4 align-middle font-medium text-white/60 text-[11px] whitespace-nowrap">
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </th>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-white/40">
                                            <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                            <span className="text-[12px]">جاري تحميل البيانات...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="border-b border-white/[0.08] hover:bg-white/[0.02] transition-colors"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-4 py-3 align-middle">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="h-32 text-center text-white/40 text-[13px]">
                                        لم يتم العثور على أي طلبات تواصل.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && contacts.length > 0 && (
                    <div className="p-4 border-t border-white/[0.08] flex items-center justify-between bg-black/20">
                        <div className="text-[12px] text-white/40">
                            الصفحة {table.getState().pagination.pageIndex + 1} من {Math.max(1, table.getPageCount())}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                className="h-8 px-3 text-[12px] font-medium rounded-md border border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                السابق
                            </button>
                            <button
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                className="h-8 px-3 text-[12px] font-medium rounded-md border border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Contacts;
