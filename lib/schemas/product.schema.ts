import { z } from 'zod';

// ─── Shared sub-schemas ────────────────────────────────────────────────────

const variantSchema = z.object({
  name:   z.string().min(1, 'Variant name required'),
  stock:  z.number().int().nonnegative().default(0),
  price:  z.number().nonnegative().optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
});

const faqSchema = z.object({
  question: z.string().optional(),
  answer:   z.string().optional(),
});

const cityPricingSchema = z.object({
  governorate:  z.string().min(1),
  shippingCost: z.number().nonnegative().optional(),
  codFee:       z.number().nonnegative().optional(),
  isActive:     z.boolean().default(true),
});

// ─── Create schema (POST) ──────────────────────────────────────────────────

export const createProductSchema = z.object({
  name:                z.string().min(1, 'Name is required'),
  price:               z.number().nonnegative('Price must be ≥ 0'),
  originalPrice:       z.number().nonnegative().optional(),
  discount:            z.number().min(0).max(100).optional(),
  mainImage:           z.string().min(1, 'Main image is required'),
  images:              z.array(z.string()).default([]),
  videos:              z.array(z.string()).default([]),
  description:         z.string().min(1, 'Description is required'),
  promoCode:           z.string().optional().default(''),
  variants:            z.array(variantSchema).default([]),
  stock:               z.number().int().nonnegative().default(0),
  isActive:            z.boolean().default(true),
  order:               z.number().int().default(0),
  detailedDescription: z.string().optional().default(''),
  specifications:      z.string().optional().default(''),
  shippingInfo:        z.string().optional().default(''),
  faqs:                z.array(faqSchema).default([]),
  showOutOfStockBadge: z.boolean().default(false),
  showPreorderBadge:   z.boolean().default(false),
  customOutOfStockMessage: z.string().optional().default(''),
  cityPricing:         z.array(cityPricingSchema).default([]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// ─── Update schema (PUT) — all fields optional ────────────────────────────

export const updateProductSchema = createProductSchema.partial().extend({
  // On updates, name/mainImage/description are still validated if provided
  name:        z.string().min(1).optional(),
  mainImage:   z.string().min(1).optional(),
  description: z.string().min(1).optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
