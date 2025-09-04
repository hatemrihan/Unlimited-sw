import React, { useState, useEffect } from 'react';
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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Download, ExternalLink, Eye } from "lucide-react";
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

interface OrderProduct {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Order {
  _id: string;
  orderId: string;
  customer: Customer;
  products: OrderProduct[];
  totalAmount: number;
  subtotal: number;
  shippingCost: number;
  paymentMethod: 'cashOnDelivery' | 'instaPay' | 'paymob';
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: string;
  createdAt: string;
  transactionScreenshot?: string;
  promoCode?: string;
  discountAmount?: number;
  notes?: string;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  // Function to export orders as CSV
  const exportOrdersAsCSV = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const rowsToExport = selectedRows.length > 0 ? selectedRows : table.getFilteredRowModel().rows;
    
    const csvData = [
      // CSV Headers
      ['Order ID', 'Customer Name', 'Email', 'Phone', 'Address', 'Products', 'Payment Method', 'Total Amount', 'Status', 'Order Date'],
      // CSV Rows
      ...rowsToExport.map(row => {
        const order = row.original;
        const products = order.products.map(p => `${p.name} (${p.size || 'N/A'}) x${p.quantity}`).join('; ');
        return [
          order.orderId,
          order.customer.name,
          order.customer.email,
          order.customer.phone,
          order.customer.address,
          products,
          order.paymentMethod === 'instaPay' ? 'InstaPay' : 'Cash on Delivery',
          `L.E ${order.totalAmount.toLocaleString()}`,
          order.status.charAt(0).toUpperCase() + order.status.slice(1),
          new Date(order.orderDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        ];
      })
    ];
    
    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to export orders as JSON
  const exportOrdersAsJSON = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const rowsToExport = selectedRows.length > 0 ? selectedRows : table.getFilteredRowModel().rows;
    
    const jsonData = rowsToExport.map(row => row.original);
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to export orders as Excel
  const exportOrdersAsExcel = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const rowsToExport = selectedRows.length > 0 ? selectedRows : table.getFilteredRowModel().rows;
    
    // Import xlsx dynamically to avoid SSR issues
    const XLSX = await import('xlsx');
    
    const excelData = rowsToExport.map(row => {
      const order = row.original;
      const products = order.products.map(p => `${p.name} (${p.size || 'N/A'}) x${p.quantity}`).join('; ');
      return {
        'Order ID': order.orderId,
        'Customer Name': order.customer.name,
        'Email': order.customer.email,
        'Phone': order.customer.phone,
        'Address': order.customer.address,
        'Products': products,
        'Payment Method': order.paymentMethod === 'instaPay' ? 'InstaPay' : 'Cash on Delivery',
        'Total Amount': order.totalAmount,
        'Status': order.status.charAt(0).toUpperCase() + order.status.slice(1),
        'Order Date': new Date(order.orderDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        'InstaPay Receipt': order.transactionScreenshot || 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    // Auto-size columns
    const maxWidth = excelData.reduce((w, r) => Math.max(w, r['Customer Name'].length), 10);
    worksheet['!cols'] = [{ wch: maxWidth }];
    
    XLSX.writeFile(workbook, `orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Function to export orders as PDF
  const exportOrdersAsPDF = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const rowsToExport = selectedRows.length > 0 ? selectedRows : table.getFilteredRowModel().rows;
    
    // Import jsPDF dynamically to avoid SSR issues
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Orders Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Prepare data for table
    const tableData = rowsToExport.map(row => {
      const order = row.original;
      const products = order.products.map(p => `${p.name} (${p.size || 'N/A'}) x${p.quantity}`).join('; ');
      return [
        order.orderId,
        order.customer.name,
        order.customer.email,
        order.paymentMethod === 'instaPay' ? 'InstaPay' : 'Cash on Delivery',
        `L.E ${order.totalAmount.toLocaleString()}`,
        order.status.charAt(0).toUpperCase() + order.status.slice(1),
        new Date(order.orderDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      ];
    });
    
    autoTable(doc, {
      head: [['Order ID', 'Customer', 'Email', 'Payment', 'Total', 'Status', 'Date']],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });
    
    doc.save(`orders_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Function to fetch all orders
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Function to update order status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update the order in the local state
        setOrders(orders.map(order => 
          order._id === orderId 
            ? { ...order, status: newStatus as Order['status'] }
            : order
        ));
        alert(`Order status updated to ${newStatus}`);
      } else {
        alert('Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status');
    }
  };

  // Function to delete order
  const handleDeleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the order from the local state
        setOrders(orders.filter(order => order._id !== orderId));
        alert('Order deleted successfully');
      } else {
        alert('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error deleting order');
    }
  };

  // Define table columns
  const columns: ColumnDef<Order>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "customer.name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-white hover:bg-white/10"
        >
          Customer
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium text-white">{row.original.customer.name}</div>
    ),
  },
  {
    accessorKey: "orderId",
    header: "Order ID",
    cell: ({ row }) => (
      <div className="font-mono text-white">{row.getValue("orderId")}</div>
    ),
  },
  {
    accessorKey: "customer.email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-white">{row.original.customer.email}</div>
    ),
  },
  {
    accessorKey: "customer.phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="text-white">{row.original.customer.phone}</div>
    ),
  },
  {
    accessorKey: "customer.address",
    header: "Shipping Address",
    cell: ({ row }) => (
      <div className="text-white">
        <div className="text-sm max-w-md whitespace-normal break-words" title={row.original.customer.address}>
          {row.original.customer.address}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "products",
    header: "Products",
    cell: ({ row }) => {
      const products = row.original.products;
      return (
        <div className="text-white">
          <div className="text-sm font-medium">{products.length} item(s)</div>
          <div className="text-xs text-gray-300 max-w-sm">
            {products.map((product, index) => (
              <div key={index} className="whitespace-normal break-words">
                {product.name} {product.size && `(${product.size})`} x{product.quantity}
              </div>
            ))}
          </div>
        </div>
      );
    },
  },

  {
    accessorKey: "paymentMethod",
    header: "Payment",
    cell: ({ row }) => {
      const method = row.getValue("paymentMethod") as string;
      return (
        <div className="text-white">
          <span className={`inline-flex px-2 py-1 text-xs rounded ${
            method === 'instaPay' ? 'bg-blue-100 text-blue-800' : 
            method === 'paymob' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {method === 'instaPay' ? 'InstaPay' : 
             method === 'paymob' ? 'Paymob' : 'Cash on Delivery'}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "promoCode",
    header: "Promo Code",
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="text-white">
          {order.promoCode ? (
            <div>
              <span className="inline-flex px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 font-medium">
                {order.promoCode}
              </span>
              {order.discountAmount && (
                <div className="text-xs text-green-400 mt-1">
                  -L.E {order.discountAmount}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-xs">No promo</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "transactionScreenshot",
    header: "Receipt",
    cell: ({ row }) => {
      const order = row.original;
      if (order.paymentMethod === 'instaPay' && order.transactionScreenshot) {
        return (
          <div className="text-white">
            <div className="flex items-center gap-2">
              <a
                href={order.transactionScreenshot}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors duration-150"
              >
                <Eye className="w-3 h-3" />
                View Receipt
              </a>
            
            </div>
          </div>
        );
      }
      return (
        <div className="text-gray-400 text-sm">
          {order.paymentMethod === 'instaPay' ? 'No receipt uploaded' : 'N/A'}
        </div>
      );
    },
  },

  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right text-white">Total</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"));
      return (
        <div className="text-right font-medium text-white">
          L.E {amount.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "orderDate",
    header: "Order Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("orderDate"));
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
      const order = row.original;

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
              onClick={() => navigator.clipboard.writeText(order.orderId)}
              className="text-white hover:bg-white/10"
            >
              Copy Order ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(order.customer.email)}
              className="text-white hover:bg-white/10"
            >
              Copy Customer Email
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(order.customer.phone)}
              className="text-white hover:bg-white/10"
            >
              Copy Customer Phone
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(order.customer.address)}
              className="text-white hover:bg-white/10"
            >
              Copy Shipping Address
            </DropdownMenuItem>

            {order.transactionScreenshot && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => window.open(order.transactionScreenshot, '_blank')}
                  className="text-white hover:bg-white/10"
                >
                  View Payment Screenshot
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                  onSelect={(e) => e.preventDefault()}
                  className="text-red-400 hover:bg-red-900/20"
                >
                  Delete Order
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the order for "{order.customer.name}" 
                    and remove it from your system.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteOrder(order._id)}>
                    Delete Order
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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="bg-black text-white min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight font-bold text-white mb-2">Orders Management</h1>
        <p className="text-gray-300">Manage and track all customer orders</p>
      </div>

      {/* Table Controls */}
      <div className="flex items-center py-4 gap-4">
        <Input
          placeholder="Filter by customer name, order ID, or email..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        
        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
              <Download className="mr-2 h-4 w-4" />
              Export As
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-white">Export Options</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={exportOrdersAsCSV}
              className="text-white hover:bg-white/10"
            >
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={exportOrdersAsExcel}
              className="text-white hover:bg-white/10"
            >
              Export as Excel
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={exportOrdersAsPDF}
              className="text-white hover:bg-white/10"
            >
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={exportOrdersAsJSON}
              className="text-white hover:bg-white/10"
            >
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-gray-400 text-xs">
              {table.getFilteredSelectedRowModel().rows.length > 0 
                ? `Export ${table.getFilteredSelectedRowModel().rows.length} selected rows`
                : `Export all ${table.getFilteredRowModel().rows.length} rows`
              }
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto text-white border-white/20 hover:bg-white/10">
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
                    className="capitalize text-white hover:bg-white/10"
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

      {/* Data Table */}
      {loadingOrders ? (
        <div className="bg-black border border-white/10 rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-3 text-white">Loading orders...</span>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-white/10">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
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
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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
                    className="h-24 text-center text-white"
                  >
                    <div className="text-center">
                      <div className="text-gray-400 text-6xl mb-4">📦</div>
                      <h3 className="text-lg font-medium text-white mb-2">No Orders Found</h3>
                      <p className="text-gray-300">
                        {globalFilter ? 'Try adjusting your search criteria.' : 'Orders will appear here once customers start placing them.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-gray-300 flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="text-white border-white/20 hover:bg-white/10"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="text-white border-white/20 hover:bg-white/10"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Orders;