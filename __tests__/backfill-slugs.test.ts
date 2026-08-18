/**
 * @jest-environment node
 *
 * The backfill writes permanent public URLs onto live products, and it is meant
 * to be run more than once — a first pass before the Arabic copy exists, then
 * again after. The re-run is the part that is easy to get wrong: the obvious
 * `if (!product.slugAr)` guard skips exactly the products the second run is for.
 *
 * These exercise the planning rules directly; no database involved.
 */
const {
  planProduct,
  makeUnique,
} = require('../scripts/backfill-slugs.js');

type Warning = string;

/** Fresh planning context per assertion. */
function ctx(existing: Array<Record<string, any>> = []) {
  return {
    takenEn: new Set(existing.map(p => p.slug).filter(Boolean)),
    takenAr: new Set(existing.map(p => p.slugAr).filter(Boolean)),
    warnings: [] as Warning[],
  };
}

const product = (over: Record<string, any> = {}) => ({
  _id: 'abc123',
  name: 'Floor parallettes',
  ...over,
});

describe('makeUnique', () => {
  it('returns the candidate when nothing has claimed it', () => {
    expect(makeUnique('floor-parallettes', new Set())).toBe('floor-parallettes');
  });

  it('appends a counter on collision', () => {
    expect(makeUnique('wall-parallel-bar', new Set(['wall-parallel-bar']))).toBe('wall-parallel-bar-2');
  });

  it('keeps counting past the first collision', () => {
    const taken = new Set(['bar', 'bar-2', 'bar-3']);
    expect(makeUnique('bar', taken)).toBe('bar-4');
  });
});

describe('first run — no slugs, no Arabic copy', () => {
  it('generates the English slug and category', () => {
    const c = ctx();
    const update = planProduct(product(), c);

    expect(update.slug).toBe('floor-parallettes');
    expect(update.category).toBe('parallettes');
  });

  it('falls back to the English slug for Arabic and says so', () => {
    const c = ctx();
    const update = planProduct(product(), c);

    expect(update.slugAr).toBe('floor-parallettes');
    expect(c.warnings.join('\n')).toMatch(/no nameAr/);
  });

  it('refuses to guess a category it was not given', () => {
    const c = ctx();
    const update = planProduct(product({ name: 'Mystery Widget' }), c);

    expect(update.category).toBeUndefined();
    expect(c.warnings.join('\n')).toMatch(/no category in CATEGORY_BY_NAME/);
  });

  it('does not hand two products the same slug', () => {
    const c = ctx();
    const first = planProduct(product({ _id: '1', name: 'Wall-parallel bar' }), c);
    const second = planProduct(product({ _id: '2', name: 'Wall-parallel bar' }), c);

    expect(first.slug).toBe('wall-parallel-bar');
    expect(second.slug).toBe('wall-parallel-bar-2');
  });
});

describe('second run — Arabic copy has arrived', () => {
  it('replaces a fallback slugAr with the real Arabic one', () => {
    // This is the case a plain `if (!product.slugAr)` guard would skip.
    const existing = product({
      slug: 'floor-parallettes',
      slugAr: 'floor-parallettes', // fallback written by the first run
      category: 'parallettes',
      nameAr: 'بارليتس أرضي',
    });

    const c = ctx([existing]);
    const update = planProduct(existing, c);

    expect(update.slugAr).toBe('بارليتس-أرضي');
    expect(c.warnings.join('\n')).toMatch(/replacing fallback slugAr/);
    expect(c.warnings.join('\n')).toMatch(/301/); // the old URL may be indexed
  });

  it('leaves a real Arabic slug alone', () => {
    const existing = product({
      slug: 'floor-parallettes',
      slugAr: 'بارليتس-أرضي',
      category: 'parallettes',
      nameAr: 'بارليتس أرضي',
    });

    const update = planProduct(existing, ctx([existing]));
    expect(update.slugAr).toBeUndefined();
  });

  it('does not rewrite a fallback when there is still no Arabic name', () => {
    const existing = product({
      slug: 'floor-parallettes',
      slugAr: 'floor-parallettes',
      category: 'parallettes',
    });

    const c = ctx([existing]);
    const update = planProduct(existing, c);

    expect(update).toEqual({});
    expect(c.warnings).toEqual([]);
  });

  it('is a no-op for a fully populated product', () => {
    const existing = product({
      slug: 'floor-parallettes',
      slugAr: 'بارليتس-أرضي',
      category: 'parallettes',
      nameAr: 'بارليتس أرضي',
    });

    expect(planProduct(existing, ctx([existing]))).toEqual({});
  });
});

describe('Arabic slug generation', () => {
  it('strips tashkeel so the URL matches what a customer types', () => {
    const p = product({ name: 'Wall bar', nameAr: 'عُقلة حائط' });
    expect(planProduct(p, ctx()).slugAr).toBe('عقلة-حائط');
  });

  it('folds Arabic-Indic digits to ASCII', () => {
    const p = product({ name: 'Wall bar', nameAr: 'عقلة ١١٠ سم' });
    expect(planProduct(p, ctx()).slugAr).toBe('عقلة-110-سم');
  });
});
