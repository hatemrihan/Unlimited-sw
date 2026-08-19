/**
 * @jest-environment node
 *
 * Phase 4 is built but not launched. The tests that matter most here are the
 * ones proving it stays that way until somebody deliberately turns a country on
 * — publishing Gulf pages before we can ship to the Gulf is the specific
 * failure the strategy document warns against.
 */
import {
  COUNTRIES,
  countryFromSegment,
  formatPrice,
  hreflangMatrix,
  isCountryPublished,
  pathPrefix,
  priceFor,
  publishedCountries,
  vatNote,
} from '../lib/countries';

const ORIGINAL = process.env.PUBLISHED_COUNTRIES;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.PUBLISHED_COUNTRIES;
  else process.env.PUBLISHED_COUNTRIES = ORIGINAL;
});

describe('the publication gate', () => {
  it('publishes Egypt and nothing else by default', () => {
    delete process.env.PUBLISHED_COUNTRIES;
    expect(publishedCountries()).toEqual(['EG']);
  });

  it.each(['SA', 'AE', 'KW'] as const)('keeps %s unpublished by default', (code) => {
    delete process.env.PUBLISHED_COUNTRIES;
    expect(isCountryPublished(code)).toBe(false);
  });

  it('opens a country only when explicitly configured', () => {
    process.env.PUBLISHED_COUNTRIES = 'EG,SA';
    expect(publishedCountries()).toEqual(['EG', 'SA']);
    expect(isCountryPublished('AE')).toBe(false);
  });

  it('ignores a country code that does not exist', () => {
    process.env.PUBLISHED_COUNTRIES = 'EG,QA';
    expect(publishedCountries()).toEqual(['EG']);
  });
});

describe('URL structure', () => {
  it('leaves Egypt on the bare paths it already ranks for', () => {
    expect(pathPrefix(COUNTRIES.EG, 'en')).toBe('');
    expect(pathPrefix(COUNTRIES.EG, 'ar')).toBe('/ar');
  });

  it('prefixes other countries with country and language', () => {
    expect(pathPrefix(COUNTRIES.SA, 'ar')).toBe('/sa/ar');
    expect(pathPrefix(COUNTRIES.AE, 'en')).toBe('/ae/en');
  });

  it('resolves a segment back to its country', () => {
    expect(countryFromSegment('sa').code).toBe('SA');
    expect(countryFromSegment('KW').code).toBe('KW');
  });

  it('falls back to Egypt for an unknown segment', () => {
    expect(countryFromSegment('qa').code).toBe('EG');
    expect(countryFromSegment(undefined).code).toBe('EG');
  });
});

describe('pricing', () => {
  const product = { price: 5400, prices: { SAR: 750, AED: 735 } };

  it('uses the EGP base price for Egypt', () => {
    expect(priceFor(product, COUNTRIES.EG)).toBe(5400);
  });

  it('uses the country price where one is set', () => {
    expect(priceFor(product, COUNTRIES.SA)).toBe(750);
  });

  it('returns null rather than an Egyptian price under a foreign currency', () => {
    // The caller must hide the product. Showing 5400 next to "KWD" would be a
    // wrong price, not a missing one.
    expect(priceFor(product, COUNTRIES.KW)).toBeNull();
  });

  it('quotes the Kuwaiti dinar to three decimals', () => {
    expect(formatPrice(12.5, COUNTRIES.KW, 'en')).toBe('12.500 KWD');
  });

  it('formats Egyptian prices with no decimals', () => {
    expect(formatPrice(5400, COUNTRIES.EG, 'en')).toBe('5,400 EGP');
    expect(formatPrice(5400, COUNTRIES.EG, 'ar')).toBe('5,400 جنيه');
  });
});

describe('VAT', () => {
  it('states KSA at 15% and UAE at 5%', () => {
    expect(vatNote(COUNTRIES.SA, 'en')).toContain('15%');
    expect(vatNote(COUNTRIES.AE, 'en')).toContain('5%');
  });

  it('says nothing where no VAT is displayed', () => {
    expect(vatNote(COUNTRIES.EG, 'en')).toBeNull();
  });
});

describe('hreflang matrix', () => {
  it('lists only published countries', () => {
    delete process.env.PUBLISHED_COUNTRIES;
    const languages = hreflangMatrix('/shop');

    // An hreflang pointing at an unpublished (noindex or absent) URL is a
    // Search Console error that devalues the whole cluster.
    expect(Object.keys(languages).sort()).toEqual(['ar-EG', 'en-EG', 'x-default']);
    expect(languages['en-EG']).toBe('https://unlimited-sw.com/shop');
    expect(languages['ar-EG']).toBe('https://unlimited-sw.com/ar/shop');
  });

  it('grows when a country is opened', () => {
    process.env.PUBLISHED_COUNTRIES = 'EG,SA';
    const languages = hreflangMatrix('/shop');

    expect(languages['ar-SA']).toBe('https://unlimited-sw.com/sa/ar/shop');
    expect(languages['en-SA']).toBe('https://unlimited-sw.com/sa/en/shop');
  });

  it('always points x-default at English Egypt', () => {
    process.env.PUBLISHED_COUNTRIES = 'EG,SA,AE';
    expect(hreflangMatrix('/shop')['x-default']).toBe('https://unlimited-sw.com/shop');
    expect(hreflangMatrix('/')['x-default']).toBe('https://unlimited-sw.com');
  });
});
