/**
 * @jest-environment node
 *
 * A missing Arabic string does not throw — it renders English on an Arabic page,
 * or nothing at all. Neither is visible in a build log, so it gets caught here.
 */
import { en } from '../i18n/en';
import { ar } from '../i18n/ar';
import { t, translator } from '../i18n';

describe('dictionaries', () => {
  it('cover exactly the same keys', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it('has no empty Arabic string', () => {
    const blank = Object.entries(ar).filter(([, value]) => !value.trim());
    expect(blank).toEqual([]);
  });

  it('actually translated the Arabic — no leftover English', () => {
    // Two keys are meant to be identical across dictionaries: the language
    // switcher label shows the OTHER language's name.
    const intentionallyShared = new Set(['nav.language']);

    const untranslated = Object.keys(en).filter(key => {
      const k = key as keyof typeof en;
      return !intentionallyShared.has(key) && ar[k] === en[k];
    });

    expect(untranslated).toEqual([]);
  });

  it('writes the Arabic in Arabic script', () => {
    // Catches a placeholder left in Latin characters.
    const latinOnly = Object.entries(ar)
      .filter(([key]) => key !== 'nav.language')
      .filter(([, value]) => !/[؀-ۿ]/.test(value));

    expect(latinOnly).toEqual([]);
  });
});

describe('t', () => {
  it('returns the string for the locale', () => {
    expect(t('en', 'product.addToCart')).toBe('Add to cart');
    expect(t('ar', 'product.addToCart')).toBe('أضف إلى السلة');
  });

  it('binds a locale via translator()', () => {
    const tr = translator('ar');
    expect(tr('nav.shop')).toBe('المتجر');
  });
});
