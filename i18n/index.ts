import { en, type StringKey } from './en';
import { ar } from './ar';
import type { Locale } from '@/lib/locale';

export type { StringKey };
export { en, ar };

const DICTIONARIES = { en, ar } as const;

/**
 * One string, in one language.
 *
 *   t('ar', 'product.addToCart') → 'أضف إلى السلة'
 *
 * The key is typed, so a typo is a build error rather than a blank space on a
 * live page.
 */
export function t(locale: Locale, key: StringKey): string {
  return DICTIONARIES[locale][key] ?? en[key];
}

/**
 * A bound translator, for components that render many strings in one language.
 *
 *   const tr = translator(locale);
 *   tr('nav.shop')
 */
export function translator(locale: Locale) {
  return (key: StringKey) => t(locale, key);
}
