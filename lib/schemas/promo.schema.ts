import { z } from 'zod';

/**
 * Validation for promo codes — the only thing standing between a typo and a
 * campaign that gives the shop away.
 *
 * The create route previously checked only that `code` and a discount existed.
 * Everything else went straight to Mongoose, so a percentage of 500 was accepted
 * and simply took the order to zero.
 */

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must look like 2026-08-15')
  .optional()
  .or(z.literal(''));

const basePromoFields = {
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters')
    .max(40, 'Code is too long')
    // Spaces make a code impossible to type reliably at checkout.
    .regex(/^[A-Za-z0-9_-]+$/, 'Code may only contain letters, numbers, - and _'),

  type: z.enum(['percentage', 'fixed']),

  discount: z.number().nonnegative('Discount cannot be negative').default(0),

  /** Only meaningful for percentage codes; caps what a big order can take off. */
  maxDiscount: z.number().positive().optional().nullable(),

  minAmount: z.number().nonnegative().optional().default(0),

  maxUses: z.number().int().positive('Usage limit must be at least 1').optional().nullable(),

  isActive: z.boolean().optional().default(true),

  validFrom: dateString,
  validUntil: dateString,

  description: z.string().trim().max(300).optional().default(''),

  waiveShipping: z.boolean().optional().default(false),
};

/**
 * A percentage over 100 is not a discount, it is a refund — and since order
 * totals are clamped at zero it silently becomes "free", which is exactly the
 * mistake worth catching before it is saved.
 */
function refineDiscount<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine(
      (data: any) => data.type !== 'percentage' || data.discount <= 100,
      { message: 'A percentage discount cannot exceed 100%', path: ['discount'] }
    )
    .refine(
      (data: any) => data.discount > 0 || data.waiveShipping,
      { message: 'Enter a discount, or switch on free shipping', path: ['discount'] }
    )
    .refine(
      (data: any) => !data.validFrom || !data.validUntil || data.validFrom <= data.validUntil,
      { message: 'The start date must be on or before the end date', path: ['validUntil'] }
    );
}

export const createPromoSchema = refineDiscount(z.object(basePromoFields));

export const updatePromoSchema = refineDiscount(
  z.object({
    ...basePromoFields,
    // On update the code itself is optional — the rest still validates if sent.
    code: basePromoFields.code.optional(),
  })
);

export type CreatePromoInput = z.infer<typeof createPromoSchema>;
export type UpdatePromoInput = z.infer<typeof updatePromoSchema>;
