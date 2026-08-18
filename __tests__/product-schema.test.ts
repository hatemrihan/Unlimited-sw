/**
 * @jest-environment node
 *
 * Stage 6: variant names must be unique within a product. `variants.$` targets
 * the first match, so duplicates mean one element never moves.
 */
import { createProductSchema, updateProductSchema } from '@/product/schema';

const base = {
  name: 'Test Hoodie',
  price: 100,
  mainImage: 'https://example.com/a.jpg',
  description: 'test',
  // Phase 2 made `category` required on create — a product with no category has
  // no category page to appear on.
  category: 'accessories',
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

// ─── Phase 2: bilingual fields, slugs, category ──────────────────────────────

describe('category', () => {
  it('is required when creating a product', () => {
    const { category, ...noCategory } = base;
    expect(createProductSchema.safeParse(noCategory).success).toBe(false);
  });

  it('rejects a category that is not one of the four', () => {
    const result = createProductSchema.safeParse({ ...base, category: 'kettlebells' });
    expect(result.success).toBe(false);
  });

  it.each(['pull-up-bars', 'dip-parallel-bars', 'parallettes', 'accessories'])(
    'accepts %s',
    (category) => {
      expect(createProductSchema.safeParse({ ...base, category }).success).toBe(true);
    }
  );

  it('is optional on update, so pre-Phase-2 products keep saving', () => {
    // The five live products have no category until the backfill runs. If this
    // were required here, editing any of them from the admin would fail.
    expect(updateProductSchema.safeParse({ price: 200 }).success).toBe(true);
  });
});

describe('slugs', () => {
  it('accepts a lowercase-kebab English slug', () => {
    const result = createProductSchema.safeParse({ ...base, slug: 'floor-parallettes' });
    expect(result.success).toBe(true);
  });

  it.each([
    ['uppercase', 'Floor-Parallettes'],
    ['spaces', 'floor parallettes'],
    ['underscores', 'floor_parallettes'],
    ['a trailing hyphen', 'floor-parallettes-'],
    ['punctuation', 'floor-parallettes!'],
  ])('rejects an English slug with %s', (_label, slug) => {
    expect(createProductSchema.safeParse({ ...base, slug }).success).toBe(false);
  });

  it('accepts an Arabic slug, which is not kebab-ASCII', () => {
    // slugAr deliberately does NOT use the English regex — the whole point is
    // that the Arabic URL contains Arabic.
    const result = createProductSchema.safeParse({ ...base, slugAr: 'بارليتس-أرضي' });
    expect(result.success).toBe(true);
  });

  it('treats both slugs as optional, so the admin can leave them blank', () => {
    expect(createProductSchema.safeParse(base).success).toBe(true);
  });
});

describe('Arabic content fields', () => {
  it('defaults every Arabic field to empty rather than undefined', () => {
    const result = createProductSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.nameAr).toBe('');
    expect(result.data.descriptionAr).toBe('');
    expect(result.data.detailedDescriptionAr).toBe('');
    expect(result.data.specificationsAr).toBe('');
    expect(result.data.faqsAr).toEqual([]);
  });

  it('accepts Arabic copy and FAQs', () => {
    const result = createProductSchema.safeParse({
      ...base,
      nameAr: 'بارليتس أرضي',
      descriptionAr: 'بارليتس أرضي مصنوع في مصر',
      faqsAr: [{ question: 'ما هو الوزن الأقصى؟', answer: '150 كجم' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('SEO overrides', () => {
  it('rejects a title longer than Google will show', () => {
    expect(createProductSchema.safeParse({ ...base, seoTitle: 'x'.repeat(71) }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, seoTitle: 'x'.repeat(70) }).success).toBe(true);
  });

  it('rejects a description longer than Google will show', () => {
    expect(createProductSchema.safeParse({ ...base, seoDescription: 'x'.repeat(161) }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, seoDescription: 'x'.repeat(160) }).success).toBe(true);
  });

  it('applies the same limits to the Arabic overrides', () => {
    expect(createProductSchema.safeParse({ ...base, seoTitleAr: 'ع'.repeat(71) }).success).toBe(false);
    expect(createProductSchema.safeParse({ ...base, seoDescriptionAr: 'ع'.repeat(161) }).success).toBe(false);
  });
});
