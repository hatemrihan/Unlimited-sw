import React from 'react';
import { ColumnDef } from "@tanstack/react-table";
import { Order, OrderStatus } from "@/hooks/useOrders";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Check, ChevronDown, Eye, Loader2, MoreHorizontal } from "lucide-react";
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
    toast.success(`تم نسخ ${label}`);
  } catch {
    toast.error("فشل النسخ إلى الحافظة");
  }
};

/**
 * The order lifecycle, in the order it actually happens.
 *
 * Every one of these states existed in the database and in the API from the
 * start — `PATCH /api/orders/[id]` has always known how to move between them,
 * restoring stock on the way into `cancelled` and re-reserving it on the way
 * out. There was simply no control anywhere in the admin panel that called it,
 * and no column that displayed it, so every order sat at `pending` forever and
 * the only available action was permanent deletion.
 */
export const ORDER_STATUSES: Array<{
  value: OrderStatus;
  label: string;
  /** Badge colours, matching the dark admin theme. */
  className: string;
}> = [
  { value: 'pending',   label: 'قيد الانتظار', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'confirmed', label: 'تم التأكيد',   className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { value: 'shipped',   label: 'تم الشحن',     className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'delivered', label: 'تم التوصيل',   className: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { value: 'cancelled', label: 'ملغي',         className: 'bg-red-500/10 text-red-400 border-red-500/20' },
];

const STATUS_BY_VALUE = new Map(ORDER_STATUSES.map(status => [status.value, status]));

export function statusLabel(value: string): string {
  return STATUS_BY_VALUE.get(value as OrderStatus)?.label ?? value;
}

export interface OrderColumnHandlers {
  openDeleteDialog: (order: Order) => void;
  /** Asks to move an order to a new status. The section owns any confirmation. */
  requestStatusChange: (order: Order, next: OrderStatus) => void;
  /** The order currently being written, so its row can show a spinner. */
  updatingOrderId: string | null;
}

export const getOrderColumns = ({
  openDeleteDialog,
  requestStatusChange,
  updatingOrderId,
}: OrderColumnHandlers): ColumnDef<Order>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="تحديد الكل"
        className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
        aria-label="تحديد الصف"
        className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black mt-1"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "customer.name",
    id: "customer_name",
    header: ({ column }) => {
      return (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors"
        >
          العميل
          <ArrowUpDown className="h-3 w-3" />
        </button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium text-[12px] text-white">{row.original.customer.name}</div>
    ),
  },
  {
    accessorKey: "orderId",
    id: "orderId",
    header: "رقم الطلب",
    cell: ({ row }) => (
      <div className="font-mono text-[11px] text-white">{row.getValue("orderId")}</div>
    ),
  },
  {
    accessorKey: "status",
    id: "status",
    header: "الحالة",
    cell: ({ row }) => {
      const order = row.original;
      const current = STATUS_BY_VALUE.get(order.status);
      const isUpdating = updatingOrderId === order._id;

      return (
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild disabled={isUpdating}>
            <button
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] rounded font-medium border transition-colors disabled:opacity-60 ${
                current?.className ?? 'bg-white/[0.06] text-white/60 border-white/[0.08]'
              }`}
              aria-label={`تغيير حالة الطلب ${order.orderId}`}
            >
              {isUpdating
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <ChevronDown className="h-3 w-3 opacity-60" />}
              {current?.label ?? order.status}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1c1917] border-white/[0.08] shadow-xl min-w-[160px]">
            <DropdownMenuLabel className="text-white/60 text-[11px]">تغيير الحالة</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            {ORDER_STATUSES.map(status => (
              <DropdownMenuItem
                key={status.value}
                disabled={status.value === order.status}
                onClick={() => requestStatusChange(order, status.value)}
                className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer flex items-center justify-between gap-2 disabled:opacity-40"
              >
                <span>{status.label}</span>
                {status.value === order.status && <Check className="h-3 w-3 text-white/60" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
  {
    accessorKey: "customer.email",
    id: "customer_email",
    header: "البريد الإلكتروني",
    cell: ({ row }) => (
      <div className="text-[12px] text-white">{row.original.customer.email || '-'}</div>
    ),
  },
  {
    accessorKey: "customer.phone",
    id: "customer_phone",
    header: "رقم الهاتف",
    cell: ({ row }) => (
      <div className="text-[12px] text-white">{row.original.customer.phone}</div>
    ),
  },
  {
    accessorKey: "customer.address",
    id: "customer_address",
    header: "العنوان",
    cell: ({ row }) => (
      <div className="text-[12px] text-white">
        <div className="whitespace-normal leading-relaxed min-w-[200px]" title={row.original.customer.address}>
          {row.original.customer.address}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "products",
    id: "products",
    header: "المنتجات",
    cell: ({ row }) => {
      const products = row.original.products;
      return (
        <div>
          <div className="text-[11px] font-medium text-white mb-1">{products.length} منتج</div>
          <div className="text-[10px] text-white/90 max-w-[200px] space-y-1">
            {products.map((product, index) => (
              <div key={`${product.productId}-${index}`} className="flex items-center justify-between border-b border-white/[0.04] pb-1 last:border-0 last:pb-0">
                <span className="truncate flex-1 ml-2" title={product.name}>{product.name}</span>
                <div className="shrink-0 space-x-2 space-x-reverse text-white">
                  {product.size && <span>مقاس: {product.size}</span>}
                  <span className="text-white">كمية: {product.quantity}</span>
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
    id: "color",
    header: "اللون",
    cell: ({ row }) => {
      const products = row.original.products;
      return (
        <div className="space-y-1">
          {products.map((product, index) => (
            <div key={`${product.productId}-${index}`}>
              {product.color ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.1] text-white border border-white/[0.08]">
                  {product.color}
                </span>
              ) : (
                <span className="text-white/40 text-[10px]">-</span>
              )}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "paymentMethod",
    id: "paymentMethod",
    header: "طريقة الدفع",
    cell: ({ row }) => {
      const method = row.getValue("paymentMethod") as Order['paymentMethod'];
      return (
        <div>
          <span className={`inline-flex px-2 py-0.5 text-[10px] rounded font-medium ${method === 'instaPay' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-white/[0.06] text-white/60 border border-white/[0.04]'
            }`}>
            {method === 'instaPay' ? 'انستا باي' : 'الدفع عند الاستلام'}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "promoCode",
    id: "promoCode",
    header: "كود الخصم",
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div>
          {order.promoCode ? (
            <div>
              <span className="inline-flex px-2 py-0.5 text-[10px] rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
                {order.promoCode}
              </span>
              {order.discountAmount && (
                <div className="text-[10px] text-green-400 font-medium mt-1">
                  - {order.discountAmount} ج.م
                </div>
              )}
            </div>
          ) : (
            <span className="text-white/20 text-[10px]">-</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "transactionScreenshot",
    id: "transactionScreenshot",
    header: "الإيصال",
    cell: ({ row }) => {
      const order = row.original;
      if (order.paymentMethod === 'instaPay' && order.transactionScreenshot) {
        return (
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
                  toast.error("رابط الإيصال غير صالح.");
                }
              }}
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              عرض
            </a>
          </div>
        );
      }
      return (
        <div className="text-white/20 text-[10px] italic">
          {order.paymentMethod === 'instaPay' ? 'لا يوجد إيصال' : '-'}
        </div>
      );
    },
  },
  {
    accessorKey: "totalAmount",
    id: "totalAmount",
    header: () => <div className="text-left">الإجمالي</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalAmount"));
      return (
        <div className="text-left font-medium text-[12px] text-white">
          {amount.toLocaleString()} ج.م
        </div>
      );
    },
  },
  {
    accessorKey: "orderDate",
    id: "orderDate",
    header: "التاريخ",
    cell: ({ row }) => {
      const rawDate = row.getValue("orderDate");
      const date = rawDate ? new Date(rawDate as string) : null;
      return (
        <div className="text-[11px] text-white whitespace-nowrap">
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
      const order = row.original;

      return (
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] rounded transition-colors">
              <span className="sr-only">فتح القائمة</span>
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1c1917] border-white/[0.08] shadow-xl min-w-[160px]">
            <DropdownMenuLabel className="text-white/60 text-[11px]">الإجراءات</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => copyToClipboard(order.orderId, "رقم الطلب")}
              className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer"
            >
              نسخ رقم الطلب
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => copyToClipboard(order.customer.email, "البريد الإلكتروني")}
              className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer"
            >
              نسخ البريد
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => copyToClipboard(order.customer.phone, "رقم الهاتف")}
              className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer"
            >
              نسخ الهاتف
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => copyToClipboard(order.customer.address, "العنوان")}
              className="text-[12px] text-white hover:bg-white/[0.06] focus:bg-white/[0.06] cursor-pointer"
            >
              نسخ العنوان
            </DropdownMenuItem>

            {order.transactionScreenshot && (
              <>
                <DropdownMenuSeparator className="bg-white/[0.08]" />
                <DropdownMenuItem
                  onClick={() => {
                     try {
                       const url = new URL(order.transactionScreenshot!);
                       window.open(url.href, '_blank');
                     } catch {
                       toast.error("رابط الإيصال غير صالح.");
                     }
                  }}
                  className="text-[12px] text-blue-400 hover:bg-blue-500/10 focus:bg-blue-500/10 cursor-pointer"
                >
                  عرض الإيصال
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            <DropdownMenuItem
              onClick={() => openDeleteDialog(order)}
              className="text-[12px] text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer"
            >
              حذف الطلب
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
