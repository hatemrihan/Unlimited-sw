# SEO Phases 2–4 — Developer & Owner Brief

**Project:** unlimited-sw.com · Next.js 15 App Router · MongoDB (Supabase planned later) · Netlify · Cloudflare
**Prerequisite:** Phase 1 deployed and verified ([`SEO-PHASE-1-DEV-BRIEF.md`](./SEO-PHASE-1-DEV-BRIEF.md)). Strategy and evidence: [`SEO-STRATEGY.md`](./SEO-STRATEGY.md).

**Fixed decisions (all phases):** domain stays `unlimited-sw.com` · brand `Unlimited SW` · Cloudflare untouched · Arabic is mandatory · Arabic URLs use **real Arabic slugs** · categories = Pull-up bars / Dip & parallel bars / Parallettes / Accessories & rings · content stored in Mongo but **Supabase-portable** (plain documents, one repository file per collection, no Mongo-only features).

**Rules (all phases):** no changes to checkout/order/stock/promo/payment logic · one PR per phase (Phase 2 may be two: 2A data, 2B routes) · every task has an acceptance check · `npm test` green.

---

# Phase 2 — Bilingual store (Arabic `/ar`), slugs, categories, product schema
**Effort:** 4–5 dev days + owner supplies Arabic copy. **Branch:** `seo/phase-2`.

## Architecture decision (read before coding)
Do **not** restructure into `app/[locale]/…` — that would move admin, api and every existing route. Instead:
- English stays exactly where it is (`/`, `/shop`, `/product/…`, `/about`, `/contact`).
- Arabic lives in a parallel folder **`app/ar/`** mirroring only public pages. `app/ar/layout.tsx` sets `<html lang="ar" dir="rtl">` — Next.js nests layouts, so we do this by making the root layout locale-aware (Task 2.3).
- Public sections/components receive a `locale: 'en' | 'ar'` prop and read strings from `i18n/en.ts` / `i18n/ar.ts`. No i18n library needed for ~60 strings.
- Product data carries both languages in the same document (`name`/`nameAr`, `description`/`descriptionAr`, `slug`/`slugAr`).

## 2A — Data model

### Task 2.1 — Product fields
**Files:** `product/schema.ts`, `product/model.ts`, `product/ui/*` (admin form)
Add to `createProductSchema` (and therefore `updateProductSchema`):
```ts
slug:            z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase-kebab').optional(),   // auto if missing
slugAr:          z.string().min(1).optional(),                                                  // Arabic words joined by "-"
nameAr:          z.string().optional().default(''),
descriptionAr:   z.string().optional().default(''),
detailedDescriptionAr: z.string().optional().default(''),
specificationsAr:      z.string().optional().default(''),
faqsAr:          z.array(faqSchema).default([]),
category:        z.enum(['pull-up-bars','dip-parallel-bars','parallettes','accessories']),
seoTitle:        z.string().max(70).optional(),   seoTitleAr:       z.string().max(70).optional(),
seoDescription:  z.string().max(160).optional(),  seoDescriptionAr: z.string().max(160).optional(),
```
Mongoose model: same fields; **unique sparse indexes** on `slug` and `slugAr` (add to `scripts/sync-indexes.js`). Add both to `__tests__/product-indexes.test.ts` / `product-schema.test.ts`.

**New file:** `product/categories.ts`
```ts
export const CATEGORIES = {
  'pull-up-bars':      { en: 'Pull-up bars',         ar: 'عقلة حائط',              slugAr: 'عقلة-حائط' },
  'dip-parallel-bars': { en: 'Dip & parallel bars',  ar: 'متوازي',                 slugAr: 'متوازي' },
  'parallettes':       { en: 'Parallettes',          ar: 'بارليتس',                slugAr: 'بارليتس' },
  'accessories':       { en: 'Accessories & rings',  ar: 'إكسسوارات وحلق جمباز',   slugAr: 'إكسسوارات' },
} as const;
export type CategoryKey = keyof typeof CATEGORIES;
```
Admin form: category `<select>`, Arabic tab for name/description/specs/FAQs, slug fields auto-filled (`slugify(name)`; Arabic: trim, collapse spaces → `-`, strip punctuation) but editable.

**New file:** `lib/slug.ts` — `slugifyEn(s)`, `slugifyAr(s)` + unit test `__tests__/slug.test.ts` (Arabic input keeps Arabic letters, removes tashkeel/punctuation, `"عقلة حائط 110 سم"` → `"عقلة-حائط-110-سم"`).

**Acceptance:** creating a product in admin without slugs stores generated `slug` + `slugAr`; duplicate slug is rejected with a clear error.

### Task 2.2 — Backfill script
**New file:** `scripts/backfill-slugs.js` (same style as `scripts/reconcile-stock.js`): for every product without `slug`/`slugAr`, generate from `name`/`nameAr` (fallback: transliterate nothing — if `nameAr` empty, use `slug` for `slugAr` too and log it). Assign `category` from a hard-coded map by product name for the 5 current products (owner confirms). Dry-run flag `--apply`.

**Acceptance:** run with `--apply` on production DB after owner has entered Arabic names; log shows 0 missing slugs.

## 2B — Routes, hreflang, schema

### Task 2.3 — Locale-aware root layout
**File:** `app/layout.tsx` — read locale from the pathname (a tiny server helper `lib/locale.ts` using `headers()` → `x-pathname` set in `middleware.ts`, **or** simpler: `app/ar/layout.tsx` re-exports a `<LocaleHtml lang="ar" dir="rtl">` wrapper and root layout renders `<html lang="en">`; pick the `middleware` header approach so there is only one `<html>`).
`middleware.ts`: extend `matcher` to `['/admin/:path*', '/((?!api|_next|.*\\..*).*)']`; for non-admin paths just `NextResponse.next({ request: { headers: withPathname } })`. **Do not touch the admin branch.**
`app/layout.tsx`: `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`; `metadata` default title/description per locale via `generateMetadata()`.

**Acceptance:** `curl -s localhost:3000/ar | grep -o '<html[^>]*>'` → `lang="ar" dir="rtl"`; `/` unchanged; `/admin` still protected (existing tests).

### Task 2.4 — Strings
**New files:** `i18n/en.ts`, `i18n/ar.ts`, `i18n/index.ts` (`t(locale, key)`). Move nav labels, hero, footer, shop headings, product page labels ("Add to cart", "Out of stock", "Preorder", "Related products", breadcrumbs), cart/checkout stay English for now (Phase 2.5 optional).

### Task 2.5 — Product route by slug + 301 from ObjectId
**Rename:** `app/product/[id]/` → `app/product/[slug]/`. In `page.tsx`:
```ts
const getProduct = cache(async (slugOrId: string) => {
  await dbConnect();
  if (/^[0-9a-fA-F]{24}$/.test(slugOrId)) return { doc: await ProductModel.findById(slugOrId).lean(), byId: true };
  return { doc: await ProductModel.findOne({ slug: slugOrId, isActive: true }).lean(), byId: false };
});
// in ProductPage: if (byId && doc?.slug) permanentRedirect(`/product/${doc.slug}`);
```
**New:** `app/ar/product/[slugAr]/page.tsx` — same but `findOne({ slugAr })`, renders `ProductClient` with `locale="ar"`, Arabic fields with English fallback.
Update every internal link builder (`Products.tsx`, `ShopClient.tsx`, `ProductClient` related products, cart items) to `/product/${slug}` (EN) or `/ar/product/${slugAr}`. Cart item `id` stays the ObjectId (order logic untouched).

**Acceptance:** `/product/<oldObjectId>` → 301 → `/product/floor-parallettes`; `/ar/product/بارليتس-أرضي` → 200 with `lang="ar"`.

### Task 2.6 — hreflang everywhere
In every public page's `generateMetadata`:
```ts
alternates: {
  canonical: enUrl,                          // or arUrl on the /ar page
  languages: { 'en-EG': enUrl, 'ar-EG': arUrl, 'x-default': enUrl },
}
```
Applies to: `/` ↔ `/ar`, `/shop` ↔ `/ar/shop`, `/shop/[category]` ↔ `/ar/shop/[slugAr]`, `/product/[slug]` ↔ `/ar/product/[slugAr]`, `/about` ↔ `/ar/about`, `/contact` ↔ `/ar/contact`.

**Acceptance:** each page HTML contains three `<link rel="alternate" hreflang=…>` and the pair is symmetric (EN page points to AR, AR page points to EN).

### Task 2.7 — Category pages
**New:** `app/shop/[category]/page.tsx`, `app/ar/shop/[category]/page.tsx` (`generateStaticParams` from `CATEGORIES`).
Content: `<h1>` = category label + " in Egypt" / " في مصر", 150–300 words intro (from `i18n/categories.{en,ar}.ts`, owner-approved copy), product grid filtered by `category`, FAQ block (3–5 Q&A per category, `FAQPage` JSON-LD), `BreadcrumbList` JSON-LD, links to the other categories.
`ShopClient` category tabs become **links** to these URLs (not client-state filters) so Google can crawl them.
Sitemap: add 4×2 category URLs with `alternates`.

**Acceptance:** `/shop/pull-up-bars` and `/ar/shop/عقلة-حائط` return 200, unique titles, ≥1 product link, `FAQPage` + `BreadcrumbList` in ld+json.

### Task 2.8 — Product JSON-LD
**File:** `app/product/[slug]/page.tsx` (+ ar) — render server-side (not in `ProductClient`):
```ts
{
  '@context':'https://schema.org','@type':'Product',
  name, image:[mainImage,...images], description: seoDescription||cleaned,
  sku: _id, brand:{'@type':'Brand',name:'Unlimited SW'},
  category: CATEGORIES[category].en,
  offers:{ '@type':'Offer', url, priceCurrency:'EGP', price,
           availability: stock>0 ? 'https://schema.org/InStock' : (showPreorderBadge ? 'https://schema.org/PreOrder' : 'https://schema.org/OutOfStock'),
           itemCondition:'https://schema.org/NewCondition',
           shippingDetails:{'@type':'OfferShippingDetails', shippingDestination:{'@type':'DefinedRegion', addressCountry:'EG'}} },
}
```
Plus `BreadcrumbList` (Home › Shop › Category › Product). If variants have different prices use `AggregateOffer` with `lowPrice`/`highPrice`. Existing `faqs` field → `FAQPage` block on the product page.

**Acceptance:** Rich Results Test on a product URL → "Product snippets" valid, 0 errors.

### Task 2.9 — Sitemap with alternates
`app/sitemap.ts`: every entry gets `alternates: { languages: { 'en-EG': …, 'ar-EG': … } }`; products use slugs; include categories, `/ar` pages. Extend `__tests__/seo-robots-sitemap.test.ts`.

### Task 2.10 — Language switcher + nav
`app/sections/Nav.tsx`: EN/AR toggle that maps current path to its counterpart (`/product/x` ↔ `/ar/product/xAr` needs the product's other slug — pass it via a small `LocaleLinkContext` set by the page). Footer links localized. WhatsApp button text localized.

### Task 2.11 — Owner content for Phase 2 (blocks 2B launch)
Arabic name + 3-sentence description + specs + 3 FAQs for each of the 5 products; 4 category intros × 2 languages; About page Arabic. I (Claude) draft, Dr. Alkady/Hatem correct.

**Phase 2 done when:** GSC shows `/ar/…` URLs indexed, hreflang report has 0 errors, product rich results appear, all acceptance checks pass on production.

---

# Phase 3 — Content & authority engine
**Effort:** ~4 dev days spread over weeks 3–10 + ongoing writing. **Branch:** `seo/phase-3`.

### Task 3.1 — Article (guides) model — Supabase-portable
**New:** `models/article.ts`, `repositories/articleRepository.ts` (the only file that talks to the DB; same pattern as `repositories/orderRepository.ts`), `__tests__/article-repository.test.ts`.
Fields (flat, no embedded docs, no Mongo operators in the repo API): `slug, slugAr, locale? (or both bodies), title, titleAr, excerpt, excerptAr, bodyMd, bodyMdAr, coverImage, authorId ('mohamed-alkady'), tags[], relatedProductIds[], publishedAt, updatedAt, isPublished, seoTitle*, seoDescription*`. Body is **Markdown** (renders anywhere; migrates to a Postgres `text` column trivially).
Repository API: `listPublished(locale)`, `getBySlug(slug, locale)`, `upsert(dto)`, `setPublished(id, bool)`. Nothing else in the codebase imports the Mongoose model.

### Task 3.2 — Guides routes
**New:** `app/guides/page.tsx`, `app/guides/[slug]/page.tsx`, `app/ar/guides/…`. `Article` JSON-LD with `author: { '@type':'Person', name:'Dr. Mohamed Alkady', url:'https://unlimited-sw.com/about', sameAs:[…] }`, `publisher: Unlimited SW`, `BreadcrumbList`, hreflang, sitemap entries. Product CTA component embedded by markdown shortcode `[[product:floor-parallettes]]`.

### Task 3.3 — Admin editor
`app/admin/guides/…` — list, create/edit (Markdown textarea + preview), publish toggle, image upload via existing `components/FileUpload.tsx`. Guarded like other admin routes (`lib/requireAdmin.ts`); add to `__tests__/admin-routes-guarded.test.ts` scope.

### Task 3.4 — Reviews
**New:** `models/review.ts`, `repositories/reviewRepository.ts`, `app/api/reviews/route.ts` (POST public with rate limit from `login/rateLimit.ts` pattern; GET approved), admin moderation page. Fields: `productId, name, rating 1–5, text, photos[], approved, createdAt`. Product page shows approved reviews + `aggregateRating` in Product JSON-LD once ≥1 approved. Post-purchase: `email/templates` — add a "review your product" email 10 days after delivery via existing `services/emailQueueService.ts` (owner decision).

### Task 3.5 — Google Merchant Center feed
**New:** `app/api/feed/google/route.ts` — RSS 2.0 / `g:` namespace XML of active products: `g:id, title, description, link (slug URL), image_link, additional_image_link, availability, price "1234.00 EGP", brand, condition new, google_product_category "Sporting Goods > Exercise & Fitness > …", shipping (EG)`. Arabic feed at `/api/feed/google?lang=ar`. Cache 1h. Owner registers Merchant Center (Egypt, EGP), verifies site (GSC), adds feed URL, enables **free listings**.

### Task 3.6 — About page rebuild (E-E-A-T)
`app/about/page.tsx` + `/ar/about`: Dr. Alkady bio, credentials, coaching record, workshop/factory photos, `Person` + `Organization` JSON-LD, `sameAs`.

### Task 3.7 — Owner/marketing (no code)
- Google Business Profile: create, category "Sporting goods store", real address/hours/phone, photos, first 10 reviews from customers.
- Google Search Console + GA4 (`purchase` event on `/thankyou`, verify it fires).
- Content calendar (first 6 guides, EN+AR): install wall bar in brick/concrete walls · door vs wall vs free-standing · beginner home calisthenics setup · parallettes vs floor: which one · how to choose bar diameter/grip · maintenance/rust care.
- Backlink outreach list: Egyptian gyms/boxes, calisthenics Instagram pages, university sports clubs, athletes coached, fitness YouTubers; PR angle "made-in-Egypt calisthenics equipment".
- Post every guide as YouTube + Reels/TikTok, embed video in the guide.

**Phase 3 done when:** ≥6 guides live in both languages, product pages show reviews + stars, Merchant free listings approved, GBP live, GSC shows impressions for Arabic informational queries.

---

# Phase 4 — Middle East expansion (KSA / UAE / Kuwait)
**Start condition (hard):** you can actually ship and price to the country (carrier, duties, returns) and Egypt organic traffic is growing month-over-month. Do **not** publish Gulf pages before that.

### Task 4.1 — Country + currency layer
`data/checkout-cities.ts` → country-aware (`EG`, `SA`, `AE`, `KW` with cities/prices); product `price` stays EGP base; add `prices: { SAR?, AED?, KWD? }` (explicit, not FX-computed at render). VAT display: KSA 15%, UAE 5%. Payment: local methods expected (Mada / Tabby / Tamara in KSA) — separate project.

### Task 4.2 — URL structure
Extend the Phase 2 pattern, one domain: `/sa/ar/…`, `/sa/en/…`, `/ae/ar/…`, `/ae/en/…`, `/kw/ar/…`. Egypt keeps `/` and `/ar` (don't move existing URLs). Country folders reuse the same page components with `{ country, locale }` props; prices/currency/shipping text per country. hreflang matrix per URL: `en-EG, ar-EG, ar-SA, en-SA, ar-AE, en-AE, ar-KW, x-default`. Sitemap per country (`app/sitemap.ts` returns multiple sitemaps or `sitemap/[id]`).

### Task 4.3 — Merchant Center per country
Feed variants `?country=SA&lang=ar` etc. Merchant Center supports SAR/AED/KWD (Shopping tab live in SA/AE). Qatar not supported at time of writing.

### Task 4.4 — Content & authority per country
Local landing pages ("معدات كاليسثينكس الرياض / جدة / دبي"), Gulf-dialect wording where different, local reviews, community/athlete partnerships, Gulf fitness media outreach.

**Phase 4 done when:** first country pages indexed with correct hreflang, first Gulf organic order.

---

## Owner checklist across phases
| Phase | Owner delivers |
|---|---|
| 2 | Arabic product names/descriptions/FAQs (5 products), category intros ×2 languages, confirm category per product |
| 3 | Merchant Center + GBP + GSC/GA4 accounts (dev helps verify), guide drafts approval, review-email decision, outreach list |
| 4 | Shipping partner + pricing per country, VAT/payment setup, go/no-go per country |
