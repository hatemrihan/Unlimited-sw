/**
 * Phase 4 — the country and currency layer.
 *
 * ⚠️  PUBLICATION IS GATED. `isCountryPublished` returns false for every Gulf
 * country until the owner turns it on, and the gate is deliberate: the strategy
 * document's own start condition is that we can actually ship, price, and take
 * returns in a country before its pages exist. Publishing before that means
 * ranking for searches we cannot fulfil, which costs more than the traffic is
 * worth — a customer who orders and cannot be delivered to is a refund, a bad
 * review, and a Merchant Center suspension risk.
 *
 * The code is here so the switch is a one-line change per country rather than a
 * project. Until it flips, Egypt is the only country the site serves and the
 * only one in the sitemap.
 *
 * Prices are explicit per country, never computed from an exchange rate at
 * render time. A price that moves with the FX rate is a price that differs
 * between the page, the cart, and Merchant Center's crawl — and Google suspends
 * accounts for exactly that mismatch.
 */

export type CountryCode = 'EG' | 'SA' | 'AE' | 'KW';

export interface Country {
  code: CountryCode;
  /** URL segment. Egypt has none — it keeps the bare paths it already ranks for. */
  segment: string | null;
  nameEn: string;
  nameAr: string;
  currency: 'EGP' | 'SAR' | 'AED' | 'KWD';
  currencyEn: string;
  currencyAr: string;
  /** Locales this country's pages exist in, in order of preference. */
  locales: Array<'ar' | 'en'>;
  /** VAT shown on prices, as a percentage. 0 means none is displayed. */
  vatPercent: number;
  /** Decimal places for money. KWD is a three-decimal currency. */
  decimals: number;
}

export const COUNTRIES: Record<CountryCode, Country> = {
  EG: {
    code: 'EG',
    segment: null,
    nameEn: 'Egypt',
    nameAr: 'مصر',
    currency: 'EGP',
    currencyEn: 'EGP',
    currencyAr: 'جنيه',
    locales: ['en', 'ar'],
    vatPercent: 0,
    decimals: 2,
  },
  SA: {
    code: 'SA',
    segment: 'sa',
    nameEn: 'Saudi Arabia',
    nameAr: 'السعودية',
    currency: 'SAR',
    currencyEn: 'SAR',
    currencyAr: 'ريال',
    locales: ['ar', 'en'],
    vatPercent: 15,
    decimals: 2,
  },
  AE: {
    code: 'AE',
    segment: 'ae',
    nameEn: 'United Arab Emirates',
    nameAr: 'الإمارات',
    currency: 'AED',
    currencyEn: 'AED',
    currencyAr: 'درهم',
    locales: ['ar', 'en'],
    vatPercent: 5,
    decimals: 2,
  },
  KW: {
    code: 'KW',
    segment: 'kw',
    nameEn: 'Kuwait',
    nameAr: 'الكويت',
    currency: 'KWD',
    currencyEn: 'KWD',
    currencyAr: 'دينار',
    locales: ['ar'],
    vatPercent: 0,
    // The dinar is quoted to three decimals; two would misprice every item.
    decimals: 3,
  },
};

export const DEFAULT_COUNTRY: CountryCode = 'EG';

/**
 * Which countries are live.
 *
 * Egypt only. Add a country here when — and only when — all of the following
 * are true for it:
 *   1. A carrier is contracted and delivery times are known.
 *   2. Duties and VAT are settled, and prices exist in `prices` on every product.
 *   3. Returns have an address and a process.
 *   4. Egypt's organic traffic is still growing month over month.
 *
 * Environment override for staging: PUBLISHED_COUNTRIES="EG,SA".
 */
export function publishedCountries(): CountryCode[] {
  const configured = process.env.PUBLISHED_COUNTRIES;
  if (!configured) return ['EG'];

  return configured
    .split(',')
    .map(code => code.trim().toUpperCase())
    .filter((code): code is CountryCode => code in COUNTRIES);
}

export function isCountryPublished(code: CountryCode): boolean {
  return publishedCountries().includes(code);
}

/** Resolves a URL segment ('sa') to a country. Egypt for anything unrecognised. */
export function countryFromSegment(segment: string | undefined): Country {
  if (!segment) return COUNTRIES.EG;

  const match = Object.values(COUNTRIES).find(c => c.segment === segment.toLowerCase());
  return match ?? COUNTRIES.EG;
}

/**
 * The path prefix for a country and locale.
 *
 *   EG + en → ''        (bare paths — never move what already ranks)
 *   EG + ar → '/ar'
 *   SA + ar → '/sa/ar'
 */
export function pathPrefix(country: Country, locale: 'en' | 'ar'): string {
  if (country.code === 'EG') return locale === 'ar' ? '/ar' : '';
  return `/${country.segment}/${locale}`;
}

/**
 * The price of a product in a country's own currency.
 *
 * Falls back to the EGP base price only for Egypt. For any other country a
 * missing price returns null, and the caller must hide the product rather than
 * show an Egyptian price under a Saudi currency label.
 */
export function priceFor(
  product: { price: number; prices?: Partial<Record<'SAR' | 'AED' | 'KWD', number>> },
  country: Country
): number | null {
  if (country.code === 'EG') return product.price;

  const price = product.prices?.[country.currency as 'SAR' | 'AED' | 'KWD'];
  return typeof price === 'number' && price > 0 ? price : null;
}

/** Formats an amount with the right decimals and currency word. */
export function formatPrice(amount: number, country: Country, locale: 'en' | 'ar'): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: country.decimals === 3 ? 3 : 0,
    maximumFractionDigits: country.decimals,
  });

  return `${formatted} ${locale === 'ar' ? country.currencyAr : country.currencyEn}`;
}

/** The VAT note to display, or null where none applies. */
export function vatNote(country: Country, locale: 'en' | 'ar'): string | null {
  if (country.vatPercent === 0) return null;

  return locale === 'ar'
    ? `الأسعار شاملة ضريبة القيمة المضافة ${country.vatPercent}%`
    : `Prices include ${country.vatPercent}% VAT`;
}

/**
 * The full hreflang matrix for one page across every PUBLISHED country.
 *
 * Only published countries appear: an hreflang pointing at a URL that is
 * noindex, or that does not exist, is an error in Search Console and devalues
 * the whole cluster.
 */
export function hreflangMatrix(pathWithinCountry: string, siteUrl = 'https://unlimited-sw.com') {
  const languages: Record<string, string> = {};

  for (const code of publishedCountries()) {
    const country = COUNTRIES[code];

    for (const locale of country.locales) {
      const prefix = pathPrefix(country, locale);
      const path = pathWithinCountry === '/' ? prefix || '/' : `${prefix}${pathWithinCountry}`;
      languages[`${locale}-${country.code}`] = `${siteUrl}${path === '/' ? '' : path}`;
    }
  }

  // English Egypt is the fallback for anyone we do not have a match for — it is
  // the version that has been indexed since the store launched.
  const egEn = pathWithinCountry === '/' ? '' : pathWithinCountry;
  languages['x-default'] = `${siteUrl}${egEn}`;

  return languages;
}
