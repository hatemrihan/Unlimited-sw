import React from 'react';
import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Eye, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  } catch {
    toast.error("Failed to copy to clipboard");
  }
};

export const getOrderColumns = (
  openDeleteDialog: (order: Order) => void
): ColumnDef<Order>[] => [
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
          className="text-gray-900 p-0 hover:bg-transparent"
        >
          Customer
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium text-gray-900">{row.original.customer.name}</div>
    ),
  },
  {
    accessorKey: "orderId",
    header: "Order ID",
    cell: ({ row }) => (
      <div className="font-mono text-gray-900">{row.getValue("orderId")}</div>
    ),
  },
  {
    accessorKey: "customer.email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-gray-900">{row.original.customer.email}</div>
    ),
  },
  {
    accessorKey: "customer.phone",
    header: "Phone",
    cell: ({ row }) => (
      <div className="text-gray-900">{row.original.customer.phone}</div>
    ),
  },
  {
    accessorKey: "customer.address",
    header: "Shipping Address",
    cell: ({ row }) => (
      <div className="text-gray-900">
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
        <div className="text-gray-900">
          <div className="text-sm font-medium">{products.length} item(s)</div>
          <div className="text-xs text-gray-500 max-w-sm">
            {products.map((product, index) => (
              <div key={`${product.productId}-${index}`} className="whitespace-normal break-words">
                <div className="font-medium text-gray-800">{product.name}</div>
                <div className="text-xs text-gray-500">
                  {product.size && <span className="mr-2">Size: {product.size}</span>}
                  <span className="font-semibold">Qty: {product.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "color",
    header: "Color",
    cell: ({ row }) => {
      const products = row.original.products;
      return (
        <div className="text-gray-900">
          {products.map((product, index) => (
            <div key={`${product.productId}-${index}`} className="mb-1">
              {product.color ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
                  🎨 {product.color.toUpperCase()}
                </span>
              ) : (
                <span className="text-gray-500 text-xs">-</span>
              )}
            </div>
          ))}
        </div>
      );
    },
  },

  {
    accessorKey: "paymentMethod",
    header: "Payment",
    cell: ({ row }) => {
      const method = row.getValue("paymentMethod") as Order['paymentMethod'];
      return (
        <div className="text-gray-900">
          <span className={`inline-flex px-2 py-1 text-xs rounded font-medium ${method === 'instaPay' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
            {method === 'instaPay' ? 'InstaPay' : 'Cash on Delivery'}
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
        <div className="text-gray-900">
          {order.promoCode ? (
            <div>
              <span className="inline-flex px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 font-medium">
                {order.promoCode}
              </span>
              {order.discountAmount && (
                <div className="text-xs text-green-600 font-semibold mt-1">
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
          <div className="text-gray-900">
            <div className="flex items-center gap-2">
              <a
                href={order.transactionScreenshot}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  try {
                    new URL(order.transactionScreenshot!);
                  } catch {
                    e.preventDefault();
                    toast.error("Invalid receipt URL provided.");
                  }
                }}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-150"
              >
                <Eye className="w-4 h-4" />
                View Receipt
              </a>
            </div>
          </div>
        );
      }
      return (
        <div className="text-gray-400 text-sm italic">
          {order.paymentMethod === 'instaPay' ? 'No receipt uploaded' : 'Cash (No Receipt)'}
        </div>
      );
    },
  },

  {
    accessorKey: "totalAmount",
    header: () => <div className="text-right text-gray-900 font-bold">Total</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"));
      return (
        <div className="text-right font-bold text-gray-900">
          L.E {amount.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "orderDate",
    header: "Order Date",
    cell: ({ row }) => {
      const rawDate = row.getValue("orderDate");
      const date = rawDate ? new Date(rawDate as string) : null;
      return (
        <div className="text-gray-900 text-sm font-medium">
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
      const order = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 text-gray-900 hover:bg-gray-100 border border-transparent hover:border-gray-200">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border-gray-200 shadow-lg">
            <DropdownMenuLabel className="text-gray-900 font-bold">Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => copyToClipboard(order.orderId, "Order ID")}
              className="text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Copy Order ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => copyToClipboard(order.customer.email, "Customer Email")}
              className="text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Copy Customer Email
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => copyToClipboard(order.customer.phone, "Customer Phone")}
              className="text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Copy Customer Phone
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => copyToClipboard(order.customer.address, "Shipping Address")}
              className="text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Copy Shipping Address
            </DropdownMenuItem>

            {order.transactionScreenshot && (
              <>
                <DropdownMenuSeparator className="bg-gray-200" />
                <DropdownMenuItem
                  onClick={() => {
                     try {
                       const url = new URL(order.transactionScreenshot!);
                       window.open(url.href, '_blank');
                     } catch {
                       toast.error("Invalid receipt URL provided.");
                     }
                  }}
                  className="text-blue-600 hover:bg-blue-50 font-medium cursor-pointer"
                >
                  View Payment Screenshot
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem
              onClick={() => openDeleteDialog(order)}
              className="text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 font-bold cursor-pointer"
            >
              Delete Order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
