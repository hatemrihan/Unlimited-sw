import { z } from 'zod';

/**
 * Validation for payment-method changes.
 *
 * The old route checked `typeof codEnabled !== 'boolean'` by hand. That worked,
 * but products and promos are both on zod now, and one validation style across
 * the codebase is worth more than any individual check.
 *
 * `strict()` matters here: it rejects unknown fields outright, so a request
 * trying to sneak `instaPayEnabled: false` — or any field the schema gains
 * later — is refused rather than quietly ignored.
 */
export const updatePaymentMethodsSchema = z
  .object({
    codEnabled: z.boolean({ message: 'codEnabled must be true or false' }),
  })
  .strict();

export type UpdatePaymentMethodsInput = z.infer<typeof updatePaymentMethodsSchema>;
