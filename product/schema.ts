import { z } from 'zod';
import { CATEGORY_KEYS, type CategoryKey } from './categories';

// ─── Shared sub-schemas ────────────────────────────────────────────────────

const variantSchema = z.object({
  name:   z.string().min(1, 'Variant name required'),
  stock:  z.number().int().nonnegative().default(0),
  price:  z.number().nonnegative().optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
});

/**
 * Variant names must be unique within a product. `variants.$` targets the first
 * matching element, so two variants called "Black" means every decrement and
 * restock hits the same one while the other drifts — corrupted inventory that
 * is very hard to trace back.
 */
const variantsSchema = z
  .array(variantSchema)
  .refine(
    variants => {
      const names = variants.map(v => v.name.trim().toLowerCase());
      return new Set(names).size === names.length;
    },
    { message: 'Variant names must be unique within a product' }
  );

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
  variants:            variantsSchema.default([]),
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

  // ─── Phase 2: bilingual content, slugs, category ─────────────────────────
  // Optional throughout: the five existing products predate these fields and
  // must keep saving from the admin form until the backfill has run and the
  // owner has supplied the Arabic copy.

  /** English URL segment. Generated from `name` when the admin leaves it blank. */
  slug:   z.string()
           .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase-kebab-case')
           .optional(),

  /** Arabic URL segment — real Arabic words joined by "-", not a transliteration. */
  slugAr: z.string().min(1).optional(),

  nameAr:                 z.string().optional().default(''),
  descriptionAr:          z.string().optional().default(''),
  detailedDescriptionAr:  z.string().optional().default(''),
  specificationsAr:       z.string().optional().default(''),
  faqsAr:                 z.array(faqSchema).default([]),

  /**
   * Required on create — an uncategorised product has no category page to live
   * on, and that is the whole point of Phase 2. `updateProductSchema` is
   * `.partial()`, so the five products that predate this field keep saving
   * until `scripts/backfill-slugs.js` assigns theirs.
   */
  category: z.enum(CATEGORY_KEYS as [CategoryKey, ...CategoryKey[]]),

  // Search-result overrides. When empty the page falls back to the generated
  // title/description, so these are a manual escape hatch, not a requirement.
  // The limits are where Google truncates.
  seoTitle:         z.string().max(70).optional(),
  seoTitleAr:       z.string().max(70).optional(),
  seoDescription:   z.string().max(160).optional(),
  seoDescriptionAr: z.string().max(160).optional(),
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
