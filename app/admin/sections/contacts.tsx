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
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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

// Columns shifted down inside component for useMemo hook wrapping

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
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => <div className="font-medium text-gray-900">{row.getValue("name")}</div>,
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => <div className="text-gray-900">{row.getValue("email")}</div>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as Contact['status'];
                return (
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${status === 'new' ? 'bg-blue-100 text-blue-800' :
                            status === 'replied' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: "Date",
            cell: ({ row }) => {
                const rawDate = row.getValue("createdAt");
                const date = rawDate ? new Date(rawDate as string) : null;
                return (
                    <div className="text-sm text-gray-500 font-medium">
                        {date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', {
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-gray-900 hover:bg-gray-100">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-gray-200">
                            <DropdownMenuLabel className="text-gray-900 font-bold">Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(contact.email);
                                    toast.success("Copied email address");
                                } catch {
                                    toast.error("Failed to copy to clipboard");
                                }
                            }} className="cursor-pointer text-gray-700 hover:bg-gray-100">
                                Copy Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-100" />
                            <DropdownMenuItem onClick={() => window.location.href = `mailto:${contact.email}`} className="cursor-pointer text-blue-600 hover:bg-blue-50 font-medium">
                                Reply via Email
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
        <div className="bg-white text-gray-900 min-h-screen p-6 relative w-full">
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl md:text-3xl tracking-tight font-bold text-gray-900 mb-1">Contact Requests</h1>
                <p className="text-gray-500 text-sm">Review incoming customer inquiries and support tickets.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center py-4 gap-4">
                <Input
                    placeholder="Search by name, email, or status..."
                    value={globalFilter ?? ""}
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    className="w-full sm:max-w-sm border-gray-200 focus-visible:ring-gray-900"
                />
            </div>

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
                        {loading ? (
                             <TableRow>
                                 <TableCell colSpan={columns.length} className="h-48 text-center text-gray-500">
                                     <div className="flex justify-center flex-col items-center py-8 gap-4">
                                         <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-gray-900 border-l-2 border-transparent"></div>
                                         <span className="font-medium animate-pulse tracking-wide">Loading secure index...</span>
                                     </div>
                                 </TableCell>
                             </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-48 text-center text-gray-500 font-medium tracking-wide">
                                    No contacts found matching your search.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            {/* Pagination Controls */}
            {!loading && contacts.length > 0 && (
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
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white font-medium"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white font-medium"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contacts;
