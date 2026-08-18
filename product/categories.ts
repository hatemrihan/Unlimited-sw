/**
 * The four store categories, fixed by decision (SEO-STRATEGY, Phase 2).
 *
 * The key is what goes in the database and the English URL; it never changes,
 * because changing it would break indexed URLs. The labels are display text and
 * can be reworded freely.
 *
 * This is a plain object, not a Mongo collection, on purpose: four categories
 * that change once a year do not need a table, and keeping them in code means
 * the type checker catches a typo'd category instead of a customer finding an
 * empty page.
 */
export const CATEGORIES = {
  'pull-up-bars': {
    en: 'Pull-up bars',
    ar: 'عقلة حائط',
    slugAr: 'عقلة-حائط',
  },
  'dip-parallel-bars': {
    en: 'Dip & parallel bars',
    ar: 'متوازي',
    slugAr: 'متوازي',
  },
  'parallettes': {
    en: 'Parallettes',
    ar: 'بارليتس',
    slugAr: 'بارليتس',
  },
  'accessories': {
    en: 'Accessories & rings',
    ar: 'إكسسوارات وحلق جمباز',
    slugAr: 'إكسسوارات',
  },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

/** The keys, in the order they should appear in navigation. */
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export function isCategoryKey(value: unknown): value is CategoryKey {
  return typeof value === 'string' && value in CATEGORIES;
}

/** Resolves an Arabic URL segment back to its category key. */
export function categoryFromArabicSlug(slugAr: string): CategoryKey | undefined {
  return CATEGORY_KEYS.find(key => CATEGORIES[key].slugAr === slugAr);
}

/** The URL segment for a category in the given locale. */
export function categorySlug(key: CategoryKey, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? CATEGORIES[key].slugAr : key;
}

/** The display label for a category in the given locale. */
export function categoryLabel(key: CategoryKey, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? CATEGORIES[key].ar : CATEGORIES[key].en;
}
