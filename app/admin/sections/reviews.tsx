import React, { useState, useEffect } from 'react';
import { IFeedback } from '../../../models/feedback';
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
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";
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
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Reviews = () => {
  const [reviews, setReviews] = useState<IFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  // Function to fetch all reviews
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/feedback');
      if (response.ok) {
        const data = await response.json();
        setReviews(data.feedback || []);
      } else {
        console.error('Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle approval status of a review
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
        // Update local state
        setReviews(reviews.map(r =>
          r._id === review._id
            ? { ...r, isApproved: !r.isApproved } as IFeedback
            : r
        ));
        alert(`Review ${!review.isApproved ? 'approved' : 'rejected'} successfully!`);
      } else {
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating review status:', error);
      alert('Error updating status. Please try again.');
    }
  };

  // Toggle public visibility status of a review
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
        // Update local state
        setReviews(reviews.map(r =>
          r._id === review._id
            ? { ...r, isShownPublic: newShowStatus } as IFeedback
            : r
        ));
        alert(`Review is now ${newShowStatus ? 'visible' : 'hidden'} publicly!`);
      } else {
        alert('Failed to update visibility. Please try again.');
      }
    } catch (error) {
      console.error('Error updating review visibility:', error);
      alert('Error updating visibility. Please try again.');
    }
  };

  // Delete a review
  const deleteReview = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/admin/feedback/${reviewId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReviews(reviews.filter(review => review._id !== reviewId));
        alert('Review deleted successfully!');
      } else {
        alert('Failed to delete review. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Error deleting review. Please try again.');
    }
  };

  // Extract customer info from message
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

  // Get clean message without customer info
  const getCleanMessage = (message: string) => {
    const lines = message.split('\n');
    return lines.filter(line =>
      !line.startsWith('From:') &&
      !line.startsWith('Email:') &&
      !line.startsWith('Phone:')
    ).join('\n').trim();
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-3 h-3 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-400'
              }`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="text-xs text-gray-400 ml-1">({rating}/5)</span>
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
      accessorKey: "_id",
      header: "Review ID",
      cell: ({ row }) => (
        <div className="font-mono text-white text-sm">{(row.getValue("_id") as string).slice(-8)}</div>
      ),
    },
    {
      accessorKey: "customerInfo",
      header: "Customer",
      cell: ({ row }) => {
        const review = row.original as IFeedback & { name?: string; email?: string; phone?: string };
        // Use new fields if available, fallback to extracting from message for old data
        const customerInfo = review.name
          ? { name: review.name, email: review.email, phone: review.phone }
          : extractCustomerInfo(row.original.message);
        return (
          <div className="text-white">
            <div className="font-medium">{customerInfo.name || 'Anonymous'}</div>
            {customerInfo.email && (
              <div className="text-xs text-gray-300">{customerInfo.email}</div>
            )}
            {customerInfo.phone && (
              <div className="text-xs text-gray-300">{customerInfo.phone}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "reviewText",
      header: "Review",
      cell: ({ row }) => {
        const review = row.original as IFeedback & { name?: string };
        // For new data, message is just the feedback; for old data, clean it
        const displayMessage = review.name ? row.original.message : getCleanMessage(row.original.message);
        return (
          <div className="text-white">
            <div className="text-sm max-w-xs truncate" title={displayMessage}>
              {displayMessage}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => (
        <div className="text-white">
          {renderStars(row.getValue("rating"))}
        </div>
      ),
    },
    {
      accessorKey: "isApproved",
      header: "Status",
      cell: ({ row }) => {
        const isApproved = row.getValue("isApproved");
        return (
          <div className="text-white">
            <span className={`inline-flex px-2 py-1 text-xs rounded ${isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
              {isApproved ? 'Approved' : 'Pending'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "isShownPublic",
      header: "Show",
      cell: ({ row }) => {
        const review = row.original;
        const isShownPublic = (review as IFeedback & { isShownPublic?: boolean }).isShownPublic;
        return (
          <div className="text-white">
            <button
              onClick={() => toggleShowStatus(review)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isShownPublic ? 'bg-green-500' : 'bg-gray-600'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isShownPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return (
          <div className="text-white text-sm">
            {date.toLocaleDateString('en-US', {
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-white hover:bg-white/10">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-white">Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => toggleApprovalStatus(review)}
                className="text-white hover:bg-white/10"
              >
                {review.isApproved ? 'Reject Review' : 'Approve Review'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(getCleanMessage(review.message as string))}
                className="text-white hover:bg-white/10"
              >
                Copy Review Text
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete Review
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the review.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteReview(review._id as string)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
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
    },
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight font-bold text-white mb-2">
          Reviews
        </h1>
        <div className="h-1 w-24 sm:w-32 md:w-40 bg-white"></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-black border border-white/10 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{reviews.length}</div>
          <div className="text-gray-400 text-sm">Total Reviews</div>
        </div>
        <div className="bg-black border border-white/10 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {reviews.filter(r => r.isApproved).length}
          </div>
          <div className="text-gray-400 text-sm">Approved</div>
        </div>
        <div className="bg-black border border-white/10 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {reviews.filter(r => !r.isApproved).length}
          </div>
          <div className="text-gray-400 text-sm">Pending</div>
        </div>
        <div className="bg-black border border-white/10 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">
            {reviews.filter(r => (r as IFeedback & { isShownPublic?: boolean }).isShownPublic).length}
          </div>
          <div className="text-gray-400 text-sm">Shown Publicly</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center py-4 gap-4">
        <Input
          placeholder="Filter reviews..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm bg-transparent border-white/20 text-white placeholder:text-gray-400"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto bg-transparent border-white/20 text-white hover:bg-white/10">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize text-white"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border border-white/10">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-white/10">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-white">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
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
                  className="border-white/10 hover:bg-white/5"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-white">
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
                  className="h-24 text-center text-gray-400"
                >
                  {loading ? "Loading reviews..." : "No reviews found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-gray-400">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
