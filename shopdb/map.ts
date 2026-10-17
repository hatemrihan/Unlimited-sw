/**
 * ============================================================
 * unlimited-sw · shopdb · map.ts
 * JOB: translate between the store's shapes (camelCase, Mongo-style `_id`)
 *      and the database's (snake_case shop_* rows), both ways, with no
 *      network — so every rule here is a unit test.
 * USED BY: shopdb/products.ts, shopdb/orders.ts, and the tests.
 * RULES: · a product's public id stays its OLD Mongo id when it has one
 *          (`legacy_id`), so carts saved in browsers, links, the feed and
 *          analytics keep working across the move. New products use their
 *          uuid.
 *        · the order the browser is shown is the order the DATABASE made:
 *          its number, its prices, its totals
 * ============================================================
 */

import type { Product } from '@/product/model';

const HEX24 = /^[0-9a-f]{24}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An id from before the move (a Mongo ObjectId). */
export const isLegacyId = (id: string): boolean => HEX24.test(id);
export const isUuid = (id: string): boolean => UUID.test(id);

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const optNum = (v: unknown): number | undefined => (v === null || v === undefined ? undefined : num(v));

/** Columns read for a product, variants folded in by the embed. */
export const PRODUCT_SELECT =
  '*, variants:shop_variants(id, name, stock, price, images, videos, sort_order)';

/** A shop_products row (+ its variants) as the storefront's Product. */
export function rowToProduct(row: any): Product & { _id: string; createdAt?: any; updatedAt?: any } {
  const variants = [...(row.variants ?? [])].sort(
    (a: any, b: any) => num(a.sort_order) - num(b.sort_order) || String(a.name).localeCompare(String(b.name))
  );
  return {
    _id: row.legacy_id ?? row.id,
    name: row.name,
    nameAr: row.name_ar || undefined,
    price: num(row.price),
    originalPrice: optNum(row.original_price),
    discount: optNum(row.discount),
    prices: row.prices ?? undefined,
    mainImage: row.main_image,
    images: row.images ?? [],
    videos: row.videos ?? [],
    description: row.description ?? '',
    descriptionAr: row.description_ar || undefined,
    detailedDescription: row.detailed_description || undefined,
    detailedDescriptionAr: row.detailed_description_ar || undefined,
    specifications: row.specifications || undefined,
    specificationsAr: row.specifications_ar || undefined,
    shippingInfo: row.shipping_info || undefined,
    faqs: row.faqs ?? [],
    faqsAr: row.faqs_ar ?? [],
    promoCode: row.promo_code ?? '',
    variants: variants.map((v: any) => ({
      name: v.name,
      stock: num(v.stock),
      price: optNum(v.price),
      images: v.images ?? [],
      videos: v.videos ?? [],
    })),
    stock: num(row.stock),
    isActive: row.is_active !== false,
    order: num(row.sort_order),
    showOutOfStockBadge: Boolean(row.show_out_of_stock_badge),
    showPreorderBadge: Boolean(row.show_preorder_badge),
    customOutOfStockMessage: row.custom_out_of_stock_message ?? '',
    cityPricing: row.city_pricing ?? [],
    slug: row.slug ?? undefined,
    slugAr: row.slug_ar ?? undefined,
    category: row.category ?? undefined,
    seoTitle: row.seo_title || undefined,
    seoTitleAr: row.seo_title_ar || undefined,
    seoDescription: row.seo_description || undefined,
    seoDescriptionAr: row.seo_description_ar || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The product columns an admin form writes. Stock is NOT here: a product's
 * stock moves through adjust_shop_stock (logged, optimistically locked) or
 * is the sum of its variants (kept by the database).
 */
export function productToRow(p: Partial<Product>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) row[key] = value;
  };
  set('name', p.name?.trim());
  set('name_ar', p.nameAr ?? (p.name !== undefined ? '' : undefined));
  set('price', p.price);
  set('original_price', p.originalPrice ?? (p.price !== undefined ? null : undefined));
  set('discount', p.discount);
  set('prices', p.prices);
  set('main_image', p.mainImage);
  set('images', p.images);
  set('videos', p.videos);
  set('description', p.description);
  set('description_ar', p.descriptionAr);
  set('detailed_description', p.detailedDescription);
  set('detailed_description_ar', p.detailedDescriptionAr);
  set('specifications', p.specifications);
  set('specifications_ar', p.specificationsAr);
  set('shipping_info', p.shippingInfo);
  set('faqs', p.faqs);
  set('faqs_ar', p.faqsAr);
  set('promo_code', p.promoCode);
  set('is_active', p.isActive);
  set('sort_order', p.order);
  set('show_out_of_stock_badge', p.showOutOfStockBadge);
  set('show_preorder_badge', p.showPreorderBadge);
  set('custom_out_of_stock_message', p.customOutOfStockMessage);
  set('city_pricing', p.cityPricing);
  set('slug', p.slug || (p.slug === '' ? null : undefined));
  set('slug_ar', p.slugAr || (p.slugAr === '' ? null : undefined));
  set('category', p.category || (p.category === ('' as any) ? null : undefined));
  set('seo_title', p.seoTitle);
  set('seo_title_ar', p.seoTitleAr);
  set('seo_description', p.seoDescription);
  set('seo_description_ar', p.seoDescriptionAr);
  return row;
}

/* ------------------------------------------------------------------ orders */

/** The store's two payment words → the database's. */
export function doorPaymentMethod(method: string): 'cod' | 'instapay' {
  return method === 'instaPay' ? 'instapay' : 'cod';
}

/** The database's → the store's (emails, analytics, the browser). */
export function storePaymentMethod(method: string): 'cashOnDelivery' | 'instaPay' {
  return method === 'instapay' ? 'instaPay' : 'cashOnDelivery';
}

/**
 * The validated checkout body (order/schema.ts) as place_shop_order's
 * payload. `productUuid` turns whatever id the cart holds into the row's
 * uuid; a line it cannot resolve is the caller's problem, before this.
 */
export function checkoutToDoorPayload(
  orderData: any,
  productUuid: (incoming: string) => string,
  variantOf: (line: any) => string | undefined
): Record<string, unknown> {
  const c = orderData.customer ?? {};
  return {
    client_order_id: orderData.clientOrderId || undefined,
    source: 'web',
    customer: {
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      apartment: c.apartment ?? '',
      city: c.city ?? '',
      governorate: c.governorate ?? '',
    },
    items: (orderData.products ?? []).map((line: any) => {
      const variant = variantOf(line);
      return {
        product_id: productUuid(String(line.productId)),
        ...(variant ? { variant_name: variant } : {}),
        quantity: line.quantity,
      };
    }),
    payment_method: doorPaymentMethod(orderData.paymentMethod),
    ...(orderData.transactionScreenshot ? { screenshot_path: orderData.transactionScreenshot } : {}),
    ...(orderData.promoCode ? { promo_code: orderData.promoCode } : {}),
    notes: orderData.notes ?? '',
    // What the customer saw. The door refuses if its own price differs by
    // more than 1 EGP — the store's own PRICE_TOLERANCE.
    claimed: {
      subtotal: num(orderData.subtotal),
      shipping_cost: num(orderData.shippingCost),
      cod_fee: num(orderData.codFee),
      total_amount: num(orderData.totalAmount),
    },
  };
}

/**
 * The database's order (shop_order_json) in the shape the store has always
 * handed around: the browser's confirmation, the emails, analytics. One
 * shape on both sides of the move, so nothing downstream changes.
 *
 * `publicIdOf` maps a line's product uuid back to the id the storefront
 * shows (the legacy Mongo id, when there is one).
 */
export function doorOrderToStore(order: any, publicIdOf: (uuid: string | null) => string = (u) => u ?? '') {
  return {
    _id: order.id,
    orderId: order.order_number,
    clientOrderId: order.client_order_id ?? undefined,
    customer: {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      address: [order.customer_address, order.apartment, order.city, order.governorate]
        .filter((s: string) => s && String(s).trim())
        .join(', '),
    },
    products: (order.items ?? []).map((i: any) => ({
      productId: publicIdOf(i.product_id ?? null),
      name: i.name,
      price: num(i.price),
      quantity: num(i.quantity),
      variantName: i.variant_name ?? undefined,
      size: i.variant_name ?? undefined,
      image: i.image ?? '',
    })),
    paymentMethod: storePaymentMethod(order.payment_method),
    paymentStatus: order.payment_status,
    transactionScreenshot: order.screenshot_path ?? undefined,
    totalAmount: num(order.total_amount),
    subtotal: num(order.subtotal),
    shippingCost: num(order.shipping_cost),
    codFee: num(order.cod_fee),
    promoCode: order.promo_code ?? undefined,
    discountAmount: num(order.discount_amount),
    status: order.status,
    notes: order.notes || undefined,
    orderDate: order.created_at,
    createdAt: order.created_at,
  };
}

/**
 * The checkout payload the email templates read (email/fromOrder.ts reads
 * the governorate, city and apartment from it) rebuilt from the order, for
 * the outbox drain, which has only the order.
 */
export function doorOrderToEmailData(order: any) {
  return {
    customer: {
      address: order.customer_address,
      apartment: order.apartment ?? '',
      city: order.city ?? '',
      governorate: order.governorate ?? '',
    },
    notes: order.notes ?? '',
    promoCode: order.promo_code ?? '',
    discountAmount: num(order.discount_amount),
  };
}

/**
 * A door's refusal (CODE or CODE:detail) as the store's HTTP answer. The
 * sentences are the store's own, in English, as before the move: the
 * customer sees what they saw yesterday.
 */
export function doorRefusalToResponse(message: string): { status: number; body: Record<string, unknown> } {
  const raw = message.trim();
  const cut = raw.indexOf(':');
  const code = cut < 0 ? raw : raw.slice(0, cut);
  const detail = cut < 0 ? '' : raw.slice(cut + 1).trim();
  const refuse = (status: number, error: string, extra: Record<string, unknown> = {}) => ({
    status,
    body: { success: false, error, ...extra },
  });

  switch (code) {
    case 'PRICING_MISMATCH':
      return refuse(409, 'Prices changed while you were checking out. Refresh to see the current total before you continue.', {
        code: 'PRICING_MISMATCH',
      });
    case 'PROMO_REJECTED':
      return refuse(409, `${detail || 'This promo code cannot be used'}. Your order total has been updated without the discount — please review it before continuing.`, {
        code: 'PROMO_REJECTED',
      });
    case 'PROMO_FULL':
      return refuse(400, `Promo code "${detail}" has reached its usage limit. Please try a different code.`);
    case 'OUT_OF_STOCK':
      return refuse(400, `${detail || 'An item'} just sold out. Please update your cart and try again.`, { code: 'OUT_OF_STOCK' });
    case 'PRODUCT_UNAVAILABLE':
      return refuse(400, `${detail || 'That item'} is not available right now. Please refresh the page and try again.`);
    case 'VARIANT_REQUIRED':
    case 'VARIANT_UNKNOWN':
      return refuse(400, `Please choose an option for ${detail || 'this item'} and try again.`);
    case 'ORDERS_PAUSED':
      return refuse(503, 'Orders are paused for maintenance right now. Please try again shortly, or contact us.', {
        code: 'ORDERS_DISABLED',
      });
    case 'INVALID_PHONE':
      return refuse(400, 'Enter a valid Egyptian mobile number, e.g. 01012345678', { field: 'customer.phone' });
    case 'INVALID_EMAIL':
      return refuse(400, 'Enter a valid email address', { field: 'customer.email' });
    case 'NAME_REQUIRED':
      return refuse(400, 'Name is required', { field: 'customer.name' });
    case 'ADDRESS_REQUIRED':
      return refuse(400, 'Address is required', { field: 'customer.address' });
    case 'SCREENSHOT_REQUIRED':
      return refuse(400, 'Transaction screenshot is required for InstaPay payments', { field: 'transactionScreenshot' });
    case 'NO_ITEMS':
    case 'TOO_MANY_ITEMS':
    case 'BAD_QUANTITY':
      return refuse(400, 'Some of the order details are not valid. Please check and try again.', { code: 'VALIDATION_FAILED' });
    default:
      return refuse(500, 'Something went wrong placing your order. Please try again, or contact us if it keeps happening.');
  }
}

/* ------------------------------------------------------------------ promos */

/** shop_promo_codes → the admin page's promo shape (app/api/promo). */
export function promoRowToAdmin(row: any) {
  return {
    _id: row.id,
    code: row.code,
    discount: num(row.discount_value),
    type: row.discount_type,
    minAmount: num(row.minimum_order),
    maxUses: row.usage_limit ?? null,
    maxDiscount: row.maximum_discount ?? null,
    currentUses: num(row.used_count),
    isActive: row.is_active,
    validFrom: row.starts_at ?? row.created_at,
    validUntil: row.expires_at ?? undefined,
    description: row.description ?? '',
    waiveShipping: Boolean(row.waive_shipping),
  };
}

/** The Cairo calendar day of a moment, YYYY-MM-DD (promo windows are days there). */
export function cairoToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(now);
}

/**
 * The promo rules, as shop_price_order applies them (20260906000600):
 * window by Cairo day, usage limit, minimum order, percentage capped by
 * maximum discount, rounded like Math.round. Used to answer the checkout's
 * "apply" button; the door re-checks at the order.
 */
export function judgePromo(row: any | null, orderTotal: number, today: string = cairoToday()) {
  if (!row || !row.is_active) return { success: false as const, error: 'Invalid promo code' };
  if (row.starts_at && today < String(row.starts_at)) return { success: false as const, error: 'Promo code is not active yet' };
  if (row.expires_at && today > String(row.expires_at)) return { success: false as const, error: 'Promo code has expired' };
  if (row.usage_limit !== null && row.usage_limit !== undefined && num(row.used_count) >= num(row.usage_limit)) {
    return { success: false as const, error: 'Promo code usage limit exceeded' };
  }
  if (row.minimum_order !== null && row.minimum_order !== undefined && orderTotal < num(row.minimum_order)) {
    return { success: false as const, error: `Minimum order of L.E ${num(row.minimum_order).toFixed(2)} required` };
  }
  const value = num(row.discount_value);
  let raw = row.discount_type === 'percentage' ? (orderTotal * value) / 100 : value;
  if (row.discount_type === 'percentage' && row.maximum_discount !== null && row.maximum_discount !== undefined) {
    raw = Math.min(raw, num(row.maximum_discount));
  }
  return {
    success: true as const,
    promo: {
      code: row.code,
      discountType: row.discount_type,
      discountValue: value,
      discount: Math.round(raw),
      description: row.description ?? '',
      waiveShipping: Boolean(row.waive_shipping),
    },
  };
}
