/**
 * URL slugs for both languages.
 *
 * Arabic slugs are a deliberate decision (SEO-STRATEGY §Phase 2): Egyptian
 * customers search in Arabic, and an Arabic URL is what Google shows them.
 * Browsers percent-encode the Arabic on the wire and render it back as Arabic in
 * the address bar, so `/ar/product/عقلة-حائط` is both valid and readable.
 *
 * The two languages need different rules, so they are two functions rather than
 * one clever one:
 *   - English: lowercase ASCII kebab-case.
 *   - Arabic:  keep the Arabic letters, drop the marks that are invisible in a
 *              URL but change the string.
 */

/** Tatweel (ـ) plus the combining marks: fatha, damma, sukun, shadda, superscript alef… */
const ARABIC_DIACRITICS = /[ـً-ٰٟۖ-ۭ]/g;

/** Arabic-Indic (٠-٩) and extended Arabic-Indic (۰-۹) digits. */
const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/g;

/**
 * Everything we keep in an Arabic slug: Arabic letters, ASCII letters/digits
 * (model numbers and units are often written in Latin), and the separator.
 */
const ARABIC_SLUG_ALLOWED = /[^ء-غف-يٮ-ۓa-z0-9-]/g;

/**
 * Fold the Arabic-Indic digits to ASCII.
 *
 * "١١٠ سم" and "110 سم" are the same product to a customer, and admins type
 * whichever keyboard is in front of them. Folding them means one product cannot
 * end up with two slugs that look identical to a reader.
 */
function foldArabicDigits(input: string): string {
  return input.replace(ARABIC_INDIC_DIGITS, ch => {
    const code = ch.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/** Collapse runs of separators and trim them from both ends. */
function tidySeparators(input: string): string {
  return input.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * "Floor Parallettes (Pro) — 2024" → "floor-parallettes-pro-2024"
 *
 * Accents are stripped via NFD so "Bär" and "Bar" cannot become two URLs.
 */
export function slugifyEn(input: string): string {
  if (!input) return '';

  return tidySeparators(
    input
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // combining accents left over from NFD
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
  );
}

/**
 * "عقلة حائط 110 سم" → "عقلة-حائط-110-سم"
 *
 * Diacritics go first: they are invisible in a URL, so a slug carrying them
 * would look identical to one without and silently fail to match.
 */
export function slugifyAr(input: string): string {
  if (!input) return '';

  return tidySeparators(
    foldArabicDigits(input)
      .replace(ARABIC_DIACRITICS, '')
      .toLowerCase() // only affects any Latin characters mixed in
      .replace(/\s+/g, '-')
      .replace(ARABIC_SLUG_ALLOWED, '')
  );
}

/**
 * Picks the right slugifier for a locale, falling back to the English slug when
 * there is no Arabic name yet — a product must always be reachable.
 */
export function slugifyFor(locale: 'en' | 'ar', input: string, fallback = ''): string {
  const slug = locale === 'ar' ? slugifyAr(input) : slugifyEn(input);
  return slug || fallback;
}
