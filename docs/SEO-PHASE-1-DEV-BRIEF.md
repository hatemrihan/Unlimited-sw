# SEO Phase 1 — Developer Brief

**Project:** unlimited-sw.com (Next.js 15 App Router · MongoDB · Netlify · Cloudflare)
**Goal of this phase:** fix everything that currently hides the store from Google. No redesign, no new features, no Arabic yet (that's Phase 2).
**Effort:** ~1 working day. **Branch:** `seo/phase-1`. One PR, all tests green (`npm test`), then deploy.
**Context:** full audit in [`docs/SEO-STRATEGY.md`](./SEO-STRATEGY.md) §2 (finding IDs T1–T18 referenced below).

## Fixed decisions (do not change)
- Domain stays `https://unlimited-sw.com` — no subdomain, no new domain.
- Brand text everywhere in `<title>` / OG / schema: **`Unlimited SW`** (not `UNLIMITED-SW`).
- Cloudflare's managed robots.txt stays **on**. Do not touch Cloudflare.
- Owner supplies: real phone, social URLs, `logo.png`, `og-image.jpg` (task 12). Use placeholders `TODO_PHONE` etc. only where noted, never ship the fake `+20-XXX-XXX-XXXX`.

## Rules
- Do not change any checkout, cart, order, stock, promo, admin or payment logic. SEO files only.
- Every task has an **Acceptance** check. Run it locally (`npm run build && npm start`, then `curl` against `localhost:3000`) before opening the PR; run again against production after deploy.
- Keep the existing patterns: server component fetches Mongo directly (see `app/page.tsx` — never `fetch()` your own `/api/*` from the server).

---

## Task 1 — Real `<h1>` on the homepage (T1)
**File:** `app/sections/Hero.tsx`
**Problem:** the `<h1>` (line ~132) contains a locally-defined `HeaderTypewriter` that renders text only after `useEffect`, so server HTML is `<h1><span></span>|</h1>`. Google indexes an empty heading.
**Do:**
1. Delete the local `HeaderTypewriter` in `Hero.tsx` (line ~13).
2. Import and use `app/about/HeaderTypewriter.tsx` instead — it already renders the full sentence in a visually-hidden span server-side and animates on top (read its doc comment).
3. Keep the same text: `WHERE IS ALL IN ONE PLACE\nSTRENGTH EQUIPMENT\nAND CALISTHENICS.` and same classes.

**Acceptance:** `curl -s http://localhost:3000/ | grep -o '<h1[^>]*>.\{0,300\}'` shows the full sentence inside `<h1>`.

## Task 2 — Server-render `/shop` (T2)
**Files:** `app/shop/page.tsx` (rewrite) + **new** `app/shop/ShopClient.tsx`
**Problem:** `page.tsx` is `"use client"` and loads products in `useEffect` from `/api/products`. Server HTML has zero `/product/` links.
**Do:**
1. Move the entire current component body of `app/shop/page.tsx` into `app/shop/ShopClient.tsx` (keep `"use client"` there). Change its signature to `export default function ShopClient({ initialProducts }: { initialProducts: Product[] })`; initialize `useState(initialProducts)`; remove the `useEffect` fetch and the `loading` skeleton branch (or set `loading` initial `false`).
2. New `app/shop/page.tsx` (server component):
   ```ts
   import type { Metadata } from 'next';
   import ShopClient from './ShopClient';
   import { getActiveProducts } from '@/product/actions';

   export const metadata: Metadata = {
     title: 'Shop Calisthenics Equipment in Egypt',           // template adds " | Unlimited SW"
     description: 'Wall-mounted pull-up bars, dip & parallel bars, parallettes and calisthenics gear made in Egypt. Prices in EGP, delivery across Egypt, cash on delivery.',
     alternates: { canonical: 'https://unlimited-sw.com/shop' },
     openGraph: { title: 'Shop Calisthenics Equipment in Egypt | Unlimited SW', url: 'https://unlimited-sw.com/shop', type: 'website' },
   };

   export default async function ShopPage() {
     let products: any[] = [];
     try {
       products = JSON.parse(JSON.stringify(await getActiveProducts()));
     } catch (e) { console.error('shop: product fetch failed', e); }
     return <ShopClient initialProducts={products} />;
   }
   ```
3. Category filter + search stay client-side inside `ShopClient` — unchanged behaviour for users.

**Acceptance:** `curl -s http://localhost:3000/shop | grep -c 'href="/product/'` ≥ number of active products (currently 5). `<title>` = `Shop Calisthenics Equipment in Egypt | Unlimited SW`.

## Task 3 — Delete the empty `public/robots.txt` (T3)
**File:** `public/robots.txt` → **delete**.
**Why:** a static file in `public/` overrides the `app/robots.ts` route; this file is 0 bytes, so production serves only Cloudflare's block with no `Sitemap:` line and no `/admin` disallow.

## Task 4 — Complete `app/robots.ts` (T3)
**File:** `app/robots.ts`
```ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/cart', '/checkout', '/thankyou', '/debug-auth', '/env-check', '/access-denied', '/login'],
    }],
    sitemap: 'https://unlimited-sw.com/sitemap.xml',
    host: 'https://unlimited-sw.com',
  };
}
```
**Acceptance (prod, after deploy):** `curl -s https://unlimited-sw.com/robots.txt` — after the line `# END Cloudflare Managed Content` you must see `Disallow: /admin/` and `Sitemap: https://unlimited-sw.com/sitemap.xml`.

## Task 5 — Sitemap cleanup (T9)
**File:** `app/sitemap.ts`
- Remove the `/cart` and `/checkout` entries.
- Add `/contact` (priority 0.5, monthly) and `/policy` (0.3, yearly).
- Keep product entries as `/product/${_id}` for now (slugs are Phase 2).

**Acceptance:** `curl -s http://localhost:3000/sitemap.xml | grep -c '<loc>'` = 7 static + N products; no `cart`/`checkout` in output.

## Task 6 — Unique metadata + `noindex` on non-SEO pages (T8)
`cart`, `checkout`, `thankyou` pages are `"use client"` and **cannot** export `metadata`. Add a `layout.tsx` next to each:

**New files:** `app/cart/layout.tsx`, `app/checkout/layout.tsx`, `app/thankyou/layout.tsx`
```ts
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Your Cart',            // 'Checkout' / 'Thank You' respectively
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
```

**File:** `app/about/page.tsx` (server component, no metadata today) — add:
```ts
export const metadata: Metadata = {
  title: 'About Unlimited SW – Egyptian Calisthenics Equipment by Dr. Mohamed Alkady',
  description: 'Unlimited SW designs and manufactures calisthenics equipment in Egypt, founded by Dr. Mohamed Alkady, PhD in sports biomechanics with 14+ years of coaching.',
  alternates: { canonical: 'https://unlimited-sw.com/about' },
};
```
(Contact, terms, policy already export metadata — leave them.)

**Acceptance:** `curl -s http://localhost:3000/cart | grep -o '<meta name="robots"[^>]*>'` contains `noindex`. `/about` has its own `<title>`.

## Task 7 — Product page title/description (T6, T7)
**File:** `app/product/[id]/page.tsx` → `generateMetadata`
Replace the `title` / `description` construction with:
```ts
const cleanDescription = (raw: string | undefined, name: string, price?: number) => {
  const firstLine = (raw || '')
    .split('\n').map(s => s.replace(/^[•\-\*\s]+/, '').trim())
    .find(s => s.length > 20 && !/[؀-ۿ]/.test(s)) || '';   // first meaningful English line
  const priceTxt = price ? ` ${price.toLocaleString()} EGP.` : '';
  return `${name} by Unlimited SW —${firstLine ? ' ' + firstLine + '.' : ''}${priceTxt} Made in Egypt, delivery nationwide, cash on delivery.`.slice(0, 158);
};

const title = `${product.name} – Calisthenics Equipment Egypt`;   // template appends " | Unlimited SW"
const description = cleanDescription(product.description, product.name, product.price);
```
Also in the same function: `siteName: 'Unlimited SW'`; OG `type: 'website'` is fine. Not-found title → `'Product Not Found'`.

**Acceptance:** product `<title>` = `Floor parallettes – Calisthenics Equipment Egypt | Unlimited SW` (brand appears **once**); `<meta name="description">` is one sentence, no `•`, ≤ 160 chars.

## Task 8 — Root layout brand + OG image path (T5, T6)
**File:** `app/layout.tsx`
- `title.default` → `'Unlimited SW – Calisthenics Equipment Made in Egypt'`; `title.template` → `'%s | Unlimited SW'`.
- `authors/creator/publisher/siteName` → `'Unlimited SW'`.
- OG + Twitter `images` → `'/og-image.jpg'` (file arrives in Task 12). Remove `/one-image.jpg` references.
- Keep `metadataBase`. Remove `keywords` (harmless, ignored by Google) — optional.

**Acceptance:** `curl -sI http://localhost:3000/og-image.jpg` → 200 (after Task 12).

## Task 9 — Fix homepage structured data (T12)
**File:** `app/page.tsx` → `structuredData`
- `"@type": "SportingGoodsStore"` (subtype of Store/LocalBusiness).
- `"telephone"`: real number from owner (`+20XXXXXXXXXX` E.164). **Do not merge with the placeholder** — if not received yet, remove the `telephone` key.
- `"logo": "https://unlimited-sw.com/logo.png"`, `"image": "https://unlimited-sw.com/og-image.jpg"`.
- `"sameAs"`: real Instagram/Facebook/TikTok/YouTube URLs from owner; remove `https://unlimited-sw.com` from the list (a site is not "sameAs" itself).
- Add `"areaServed": { "@type": "Country", "name": "Egypt" }` and `"currenciesAccepted": "EGP"` (already there).
- Also update page `metadata.title` on `app/page.tsx` to `'Unlimited SW | Calisthenics Equipment Made in Egypt'` and `siteName: 'Unlimited SW'`; OG image → `https://unlimited-sw.com/og-image.jpg`.

**Acceptance:** paste homepage URL into https://search.google.com/test/rich-results → no errors; phone not `XXX`.

## Task 10 — One `<h1>` per page (T15)
**File:** `app/sections/Explore.tsx` line ~58: `<h1 …>Worth the Buy.</h1>` → `<h2 …>` (same classes). The `<h2>` on line ~62 becomes `<h3>`.

**Acceptance:** `curl -s http://localhost:3000/ | grep -c '<h1'` = 1.

## Task 11 — Enable image optimization (T14)
**File:** `next.config.ts`
```ts
images: {
  unoptimized: false,
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [
    { protocol: 'https', hostname: `${process.env.ALKADY_AWS_S3_BUCKET_NAME}.s3.${process.env.ALKADY_AWS_REGION}.amazonaws.com` },
  ],
  qualities: [50, 75, 85, 100],
},
```
(Replace the deprecated `domains` array.) Netlify's Next runtime (v5) serves `next/image` through Netlify Image CDN automatically.
**Risk:** if the Netlify build/runtime rejects it, images will 400 — check a product page on the deploy preview before merging. If it fails, revert this task only and report; the rest of the PR is independent.

**Acceptance:** on the deploy preview, product image `src` starts with `/_next/image?url=…` (or `/.netlify/images?…`) and returns 200 with `content-type: image/webp` or `avif`.

## Task 12 — Assets (owner provides; you place them)
**New files:** `public/og-image.jpg` (exactly 1200×630, < 300 KB, JPG), `public/logo.png` (square, ≥ 512×512, transparent OK).
Until the owner sends the OG image: export `public/images/one-image.jpg` resized/cropped to 1200×630 as a temporary `og-image.jpg`.

**Acceptance:** both URLs return 200 on production; share the homepage link in WhatsApp → preview shows the image.

## Task 13 — Regression test (new)
**New file:** `__tests__/seo-robots-sitemap.test.ts` (Node env, style of `__tests__/admin-routes-guarded.test.ts`).
Assert:
- `public/robots.txt` **does not exist** (guards Task 3 forever).
- `robots()` from `app/robots.ts` returns `sitemap === 'https://unlimited-sw.com/sitemap.xml'` and its disallow list includes `/admin/` and `/api/`.
- Reading `app/sitemap.ts` source (or calling it with a mocked `Product.find` returning `[]`) yields no `/cart` or `/checkout` URLs and includes `/shop`.
- `app/layout.tsx` source contains `Unlimited SW` and does not contain `one-image.jpg`.

Run: `npm test` — all existing suites must still pass.

---

## PR checklist (paste into the PR description)
- [ ] `npm run lint` and `npm test` green
- [ ] Local: h1 present on `/`; ≥5 `/product/` links in `/shop` HTML; only 1 `<h1>` on `/`
- [ ] Local: robots.txt has sitemap + admin disallow; sitemap has no cart/checkout
- [ ] Local: `/cart` `/checkout` `/thankyou` have `noindex`; `/about` and `/shop` have unique titles
- [ ] Product page title has brand once, description is a clean sentence
- [ ] Deploy preview: images served optimized (webp/avif) and load on product page
- [ ] `og-image.jpg` and `logo.png` return 200
- [ ] Rich Results Test on `/` — 0 errors, no placeholder phone
- [ ] After production deploy: `curl -s https://unlimited-sw.com/robots.txt` shows our block after Cloudflare's; then submit `https://unlimited-sw.com/sitemap.xml` in Google Search Console
