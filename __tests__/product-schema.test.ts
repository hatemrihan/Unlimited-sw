/**
 * @jest-environment node
 *
 * Stage 6: variant names must be unique within a product. `variants.$` targets
 * the first match, so duplicates mean one element never moves.
 */
import { createProductSchema, updateProductSchema } from '../lib/schemas/product.schema';

const base = {
  name: 'Test Hoodie',
  price: 100,
  mainImage: 'https://example.com/a.jpg',
  description: 'test',
};

describe('variant name uniqueness', () => {
  it('accepts distinct variant names', () => {
    const result = createProductSchema.safeParse({
      ...base,
      variants: [{ name: 'Black', stock: 1 }, { name: 'Red', stock: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects exact duplicates', () => {
    const result = createProductSchema.safeParse({
      ...base,
      variants: [{ name: 'Black', stock: 1 }, { name: 'Black', stock: 5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicates that differ only by case or surrounding space', () => {
    const result = createProductSchema.safeParse({
      ...base,
      variants: [{ name: 'Black', stock: 1 }, { name: ' black ', stock: 5 }],
    });
    expect(result.success).toBe(false);
  });

  it('applies the same rule on update', () => {
    const result = updateProductSchema.safeParse({
      variants: [{ name: 'Red', stock: 1 }, { name: 'RED', stock: 2 }],
    });
    expect(result.success).toBe(false);
  });

  it('still rejects negative variant stock', () => {
    const result = createProductSchema.safeParse({
      ...base,
      variants: [{ name: 'Black', stock: -1 }],
    });
    expect(result.success).toBe(false);
  });
});
