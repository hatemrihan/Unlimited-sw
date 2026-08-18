# Unlimited SW — SEO Research, Audit & Integration Plan

**Date:** 18 Aug 2026 · **Site:** unlimited-sw.com (Next.js 15 · MongoDB Atlas · Netlify · Cloudflare in front)
**Target:** Egypt first, then Saudi Arabia / UAE / Kuwait.
**Status:** Research + plan only. No code changed. Every code change below is a proposal that waits for your approval of file and function names.

---

## 0. Executive summary (read this if nothing else)

**Verdict: critical foundation gaps, but a very winnable niche.**

You are already the *only* specialist store Google shows for "calisthenics equipment Egypt" — the rest of page 1 is Amazon.eg, Noon, Facebook Marketplace and foreign brands (GORNATION, THENX). Nobody in Egypt owns this niche in search yet. But the site is currently invisible for the way Egyptians actually search (Arabic, mobile, product-specific words like **عقلة حائط**), and several technical bugs mean Google is seeing much less of the store than exists.

**Biggest strength:** the brand + founder (Dr. Mohamed Alkady, PhD biomechanics, 14 yrs coaching) is a real E-E-A-T asset. Almost no competitor has that. Products are locally manufactured with real specs — that's content nobody else can copy.

**Top 3 priorities, in order:**

1. **Fix what's broken today (week 1, ~1 day of work):** empty `<h1>` on the homepage, `/shop` renders **zero** products to Google, `robots.txt` on the live site is Cloudflare's — yours is empty and has no sitemap line, OG/social images all **404**, product titles double the brand, meta descriptions are raw bullet specs, phone number in schema is a placeholder `+20-XXX-XXX-XXXX`.
2. **Make the store bilingual properly (weeks 2–4):** `/ar` Arabic version of every product + category page with `hreflang`, Arabic slugs, Arabic titles. Egypt searches for this category are majority Arabic and 78% mobile.
3. **Turn 5 products into ~40 rankable pages (weeks 3–8):** category pages, product slugs, comparison/guide content ("عقلة حائط ولا عقلة باب؟", "how to install a wall pull-up bar in Egyptian walls"), plus Google Merchant Center free listings (Egypt/EGP is supported).

Everything else — Middle East expansion, link building, AI-search visibility — sits on top of those three.

---

## 1. How SEO actually works for *this* business (the mental model)

Skip this if you know it; it's here because you asked to understand everything.

**Google is a matching engine.** Someone types words → Google shows the pages it *trusts most* that *best match* those words. So SEO is exactly three jobs:

| Job | Question Google asks | What it means for Unlimited SW |
|---|---|---|
| **Crawl & index** | Can I even see and read your pages? | Server-rendered HTML with real text, correct robots/sitemap, one URL per product, fast on a phone on Vodafone 4G |
| **Relevance** | Do your pages match what Egyptians type? | Bilingual pages using the *exact* words: عقلة، متوازي، بارليتس، حلق جمباز, "pull up bar Egypt", "wall mounted pull up bar Cairo" |
| **Authority / trust** | Why should I rank you above Amazon.eg? | Founder credentials, real reviews, mentions from Egyptian fitness pages/Instagram/YouTube, consistent business info (Google Business Profile), structured data |

**Egypt-specific facts that change the strategy** (sources at the end):
- Google ≈ 96% of search in Egypt. Bing/Yandex are noise. Optimize for Google only.
- ~78% of Egyptian searches are mobile. Your Core Web Vitals on a mid-range Android on mobile data are the *real* speed test, not your MacBook.
- Egyptians **code-switch**: brand/tech words in English ("pull up bar", "parallettes"), everyday words in Arabic ("عقلة", "متوازي"), plus Franco-Arabic ("3o2la"). Google normalizes some of this but *not* enough — you need pages in both languages.
- Marketplaces (Amazon.eg, Noon, Jumia, Dubizzle) dominate generic Arabic queries. You will not out-rank them for "عقلة" alone — you win on **specific + local + expert** queries and on brand.
- AI search (ChatGPT/Perplexity/Google AI Overviews) increasingly answers "best pull up bar in Egypt" — and your Cloudflare config currently **blocks** every AI crawler (details in §2).

---

## 2. Technical audit — what I verified on the live site and in code

Legend: 🔴 critical · 🟠 high · 🟡 medium · 🟢 low. "Verified" = I fetched the live page or read the file.

| # | Finding | Sev | Evidence | Fix |
|---|---|---|---|---|
| T1 | **Homepage `<h1>` is empty in the HTML** Google receives. The typewriter animation renders the heading client-side; server HTML contains `<h1><span></span>\|</h1>`. | 🔴 | `curl https://unlimited-sw.com/` → empty h1; `app/sections/Hero.tsx:132` | Render real text in the h1 server-side; animate a *visual* layer on top (or use CSS animation on real text). |
| T2 | **`/shop` sends zero product links to Google.** Page is `"use client"` and fetches `/api/products` in `useEffect`; server HTML has `0` `/product/` links. Google *can* execute JS but crawls it late/partially, and internal-link equity from your #2 page is lost. | 🔴 | `app/shop/page.tsx` line 1 + live HTML `href="/product/` count = 0 | Make `/shop` a server component that queries Mongo (like `app/page.tsx` already does) and passes products to a client grid. |
| T3 | **Live `robots.txt` is Cloudflare's managed file only.** No `Sitemap:` line, no `Disallow: /admin/`, `/api/`. Cause: `public/robots.txt` exists (empty) and overrides `app/robots.ts`; Cloudflare then prepends its block. | 🔴 | live robots.txt ends after "# END Cloudflare Managed Content"; `public/robots.txt` = 0 bytes | Delete `public/robots.txt` so `app/robots.ts` serves; keep Cloudflare block or turn it off (see T4). |
| T4 | **All AI crawlers blocked** (GPTBot, ClaudeBot, CCBot, Google-Extended, meta-externalagent, Bytespider…). Means ChatGPT search / Perplexity / Meta AI can't recommend you. Google-Extended off does *not* remove you from Google AI Overviews, but the others do remove you from those engines. | 🟠 | live robots.txt | Business decision. My recommendation: **allow** GPTBot, ClaudeBot, PerplexityBot, meta-externalagent; keep blocking Bytespider/CCBot. Do it in Cloudflare dashboard → Security → Bots → "managed robots.txt". |
| T5 | **Social share images 404.** Layout references `/one-image.jpg`; home + product fallback reference `/og-image.jpg`; schema references `/logo.png`. All three return 404. Every WhatsApp/Facebook/Instagram share of the site shows no image. | 🟠 | curl → 404 ×3; file actually lives at `public/images/one-image.jpg` | Add real `public/og-image.jpg` (1200×630) and `public/logo.png`; fix paths. |
| T6 | **Product titles duplicate the brand:** `Floor parallettes \| Unlimited SW \| UNLIMITED-SW` — page sets `"X \| Unlimited SW"` and layout template appends `\| UNLIMITED-SW` again. | 🟠 | live `<title>` | Return just `product.name` (+ Arabic + "Egypt") and let the template add the brand. Standardize brand to one spelling. |
| T7 | **Meta descriptions are raw spec bullets** ("• Material: Beech wood • Length: 50 cm…"). Truncated, no intent words, no price/delivery/Egypt. | 🟠 | live product page | Generate: `"{name} — {1-line benefit}. {price} EGP, delivery across Egypt, cash on delivery. Made by Unlimited SW."` |
| T8 | **`/shop`, `/about`, `/cart`, `/checkout` share the same generic title + description** (they fall back to the layout). | 🟠 | live titles | Add `metadata` export to each page (shop/about need real ones; cart/checkout should be `noindex`). |
| T9 | **Sitemap lists `/cart` and `/checkout`** — useless pages spending crawl priority; they should be `noindex` and out of the sitemap. Sitemap has 12 URLs total (7 static + 5 products). | 🟡 | `app/sitemap.ts` + live sitemap | Remove them; add categories, blog, `/ar/…` URLs when they exist. |
| T10 | **Product URLs are Mongo ObjectIds** (`/product/69dfa9bdfd949589cc4ca6e4`). Zero keyword signal, ugly in WhatsApp shares. | 🟡 | `app/product/[id]/page.tsx` | Add `slug` (EN) + `slugAr` fields; route `/product/[slug]`; 301 old id URLs → slug (keep id lookup as fallback so nothing breaks). |
| T11 | **No `Product` structured data.** Only a `Store` block on the homepage. Without `Product` + `Offer` JSON-LD you get no price/stock/rating rich results and Merchant Center can't auto-verify. | 🟡 | `ProductClient.tsx` has no ld+json | Add `Product` JSON-LD in `product/[id]/page.tsx` (server): name, image[], description, sku, brand, offers{price, priceCurrency: EGP, availability, url}, aggregateRating later. |
| T12 | **Store schema has placeholder phone `+20-XXX-XXX-XXXX`** and `logo.png` 404. Invalid contact data hurts local trust and can trigger a Search Console error. | 🟡 | `app/page.tsx:71` | Real phone (the WhatsApp number), real logo URL, add `LocalBusiness`/`SportingGoodsStore` type + `areaServed: Egypt`. |
| T13 | **`<html lang="en">` only; no `hreflang`; Arabic text is mixed inside English descriptions.** Google can't tell it there's Arabic content, so Arabic queries don't match. | 🟠 | `app/layout.tsx:96`, product descriptions | The bilingual build in Phase 2 (§5). |
| T14 | **`images.unoptimized: true`** — every product image is served as the original S3 PNG (some 1–3 MB) with no resizing/WebP. This is the single biggest mobile speed cost. | 🟠 | `next.config.ts:9` | Turn off `unoptimized`; use `remotePatterns` for the S3 host; Netlify's Next runtime supports `next/image` optimization. Also upload WebP/AVIF from admin. |
| T15 | **Multiple `<h1>` on the homepage** (`Hero` + `Explore` "Worth the Buy."). | 🟢 | `app/sections/Explore.tsx:58` | Make Explore's an `<h2>`. |
| T16 | Homepage ships **17 script bundles**, framer-motion on every route, `unsafe-eval` CSP. Fine for now; watch INP/LCP after images are fixed. | 🟢 | live HTML | Lazy-load below-fold sections; measure with PageSpeed Insights (mobile). |
| T17 | `public/_redirects` contains `/* /index.html 200` (SPA fallback). Netlify's Next runtime normally ignores this, but if it ever wins it would break every deep URL for crawlers. | 🟢 | `public/_redirects` | Verify in Netlify deploy log; delete the line if unused. |
| T18 | Homepage `keywords` meta is set (ignored by Google since 2009 — harmless, no value). | 🟢 | `app/layout.tsx` | Leave or remove. |

**What's already good:** HTTPS + www→apex 301s, `metadataBase` set, canonical tags on product pages, `generateMetadata` with `React.cache` (nice), dynamic sitemap from Mongo, breadcrumb component exists, `next/image` with `sizes` used in shop cards, security headers, homepage products are server-rendered.

---

## 3. Keyword research — what Egyptians (and later Gulf buyers) actually type

No Ahrefs/Semrush is connected in this session, so volumes below are *relative* estimates from SERP behavior, autocomplete patterns and marketplace category depth (Amazon.eg/Noon/Jumia have dedicated "pull-up bar / عقلة" category pages = meaningful demand). Connect Ahrefs or Google Keyword Planner (free with a Google Ads account, EGP, geo=Egypt) to get numbers; the *structure* below won't change.

**Intent legend:** T = transactional (buy), C = commercial (compare), I = informational.

### 3.1 Egypt — Arabic (primary volume)

| Keyword (AR) | Meaning | Intent | Difficulty | Opportunity | Page it should rank |
|---|---|---|---|---|---|
| عقلة حائط | wall pull-up bar | T | Medium (Jumia/Dubizzle/Athlete Home rank) | **High** | Category: Wall pull-up bars |
| عقلة حائط للبيع | …for sale | T | Medium | **High** | same |
| عقلة تمارين / عقلة منزلية | home pull-up bar | T | Medium | High | same |
| سعر عقلة حائط في مصر | price in Egypt | C | Low–Med | **High** | category + price in title |
| متوازي كاليسثينكس / بار متوازي | parallel/dip bars | T | Low | **High** | Category: Dip / parallel bars |
| بارليتس / متوازي أرضي | parallettes | T | Low | **High** | Product: Floor parallettes |
| متوازي حائط | wall parallel bar | T | Low | High | Product |
| حلق جمباز / حلقات كاليسثينكس | gymnastic rings | T | Low | Medium (only if you sell them) | Product |
| معدات كاليسثينكس مصر / أدوات كاليسثينكس | calisthenics gear Egypt | T/C | Low | **High** (you rank #1-ish EN already) | Homepage + /ar |
| جيم منزلي معدات | home gym equipment | C | High (marketplaces) | Medium | Guide page |
| تركيب عقلة حائط / طريقة تثبيت العقلة | how to install | I | Low | High (converts to sale) | Guide + video |
| أفضل عقلة حائط في مصر | best wall bar Egypt | C | Low | **High** | Comparison article |
| عقلة باب ولا عقلة حائط | door vs wall bar | C | Low | High | Comparison article |
| كاليسثينكس للمبتدئين | calisthenics for beginners | I | Medium | Medium (Dr. Alkady content) | Blog / YouTube |

Note spelling variants Google treats *mostly* as one but worth using naturally across pages: كاليسثينكس / كاليستنكس / كاليسثنكس، عقلة / عقله، متوازي / متوازى.

### 3.2 Egypt — English (secondary volume, higher intent, less competition)

| Keyword | Intent | Difficulty | Opportunity | Page |
|---|---|---|---|---|
| calisthenics equipment egypt | T | Low | **High** (you already appear) | Home |
| pull up bar egypt / pull up bar cairo | T | Medium (Amazon.eg, Noon) | High | Category |
| wall mounted pull up bar egypt | T | Low | **High** | Category / product |
| dip bars egypt / parallel bars egypt | T | Low | **High** | Category |
| parallettes egypt / wooden parallettes | T | Low | **High** | Product |
| gymnastic rings egypt | T | Low | Medium | Product |
| home gym equipment egypt | C | High | Medium | Guide |
| calisthenics egypt / calisthenics cairo | I/Navigational | Low | Medium (community/brand) | About / blog |
| unlimited sw / unlimited sw egypt / mohamed alkady | Brand | — | Protect | Home, About |

### 3.3 Gulf (Phase 4 — for the plan, not now)

Saudi and UAE search the same Arabic terms plus "بار عقلة", "أجهزة كاليسثينكس", English "calisthenics equipment saudi arabia / dubai / uae". Competition: Sun & Sand Sports, 1441 Fitness, Aldowly, GORNATION shipping worldwide, Ubuy. Local specialist calisthenics brands are almost absent — same gap as Egypt, higher basket values.

---

## 4. Competitor snapshot (Egypt)

| | Unlimited SW | Amazon.eg / Noon / Jumia | Athlete Home (athletehome-eg.com) | Kanteen Store | GORNATION (global) |
|---|---|---|---|---|---|
| Platform | Next.js custom | Marketplaces | Shopify | Shopify | Shopify |
| Arabic pages | ✗ (mixed text) | ✓ AR + EN, hreflang | ✓ `lang="ar"`, EN/AR hreflang | ✓ AR-first | ✗ (EN/DE) |
| Product schema | ✗ | ✓ | ✓ (2 ld+json blocks) | ✓ (Shopify default) | ✓ |
| Catalog depth | 5 products | thousands | dozens | dozens | hundreds |
| Content / guides | ✗ | ✗ | some | ✗ | ✓ strong (blog, YouTube) |
| Founder / expert authority | **✓ strong (PhD coach)** | ✗ | weak | ✗ | ✓ athletes |
| Ranks for "عقلة حائط" | ✗ | ✓ | ✓ | ✓ | ✗ |
| Ranks for "calisthenics equipment egypt" | **✓** | ✓ | ✗ | ✗ | ✓ |
| Product quality/spec detail | ✓ (real steel thickness, dims) | mixed | ✓ | low | ✓ |

**Takeaway:** the Shopify competitors get Arabic + schema *for free* from the platform. You have to build it — but once built, you have the authority story none of them have. GORNATION is the model to copy for content and brand; Athlete Home is the model to beat for Arabic product pages.

---

## 5. Integration plan — how SEO gets built into the shop

Four phases. Each phase ends with a check I can run (curl/GSC), and **no phase starts until you approve its file list.**

### Phase 1 — Stop the bleeding (Week 1) · ~1 dev day · impact: high

| Change | File(s) | Detail |
|---|---|---|
| Real H1 on homepage | `app/sections/Hero.tsx` | Put the actual sentence in the `<h1>`; run the typewriter as an overlay/CSS effect (`aria-hidden`), or animate the real text with CSS `steps()`. |
| Server-render `/shop` | `app/shop/page.tsx` → split into `page.tsx` (server, `metadata`, fetch via `product/actions.getActiveProducts`) + `ShopClient.tsx` (current UI receiving `initialProducts`) | Same pattern the homepage already uses. |
| Robots fix | delete `public/robots.txt`; edit `app/robots.ts` | Add `disallow: ['/admin/','/api/','/cart','/checkout','/thankyou','/debug-auth','/env-check','/access-denied']`, keep `sitemap`. Toggle Cloudflare managed robots (T4) per your decision. |
| Sitemap cleanup | `app/sitemap.ts` | Remove cart/checkout; add `/contact`, `/policy`. |
| Metadata per page | `app/shop/page.tsx`, `app/about/page.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/thankyou/page.tsx` | Unique titles/descriptions; `robots: { index: false }` on cart/checkout/thankyou. |
| Product title/description | `app/product/[id]/page.tsx` `generateMetadata` | Title = `${name} – Calisthenics Equipment Egypt`; description generated from name + first benefit line + price EGP + delivery. Strip bullets/newlines. |
| OG image + logo | add `public/og-image.jpg` (1200×630), `public/logo.png`; fix `app/layout.tsx` path | I'll need you to pick/approve the image (can be `public/images/one-image.jpg` resized). |
| Store schema fix | `app/page.tsx` structuredData | Real phone, `logo`, `@type: SportingGoodsStore`, `areaServed`, `sameAs` with real Instagram/Facebook/TikTok/YouTube URLs (please send them). |
| Explore h1 → h2 | `app/sections/Explore.tsx` | one-line change |
| Image optimization | `next.config.ts` | `unoptimized: false`, `remotePatterns: [{ protocol:'https', hostname:'alkady.s3.us-east-1.amazonaws.com' }]`, formats `['image/avif','image/webp']`. Verify Netlify build afterwards. |
| Search Console + GA4 | no code (or `app/layout.tsx` for verification tag) | Verify domain property via DNS in Cloudflare; submit sitemap. This is how we *measure* every later phase. |

**Test I'll add:** a Jest test that fetches `robots()` and `sitemap()` and asserts no `/cart`, no `/admin`, sitemap URL present — same style as `__tests__/admin-routes-guarded.test.ts`.

### Phase 2 — Bilingual store (Weeks 2–4) · ~4–5 dev days · impact: very high

Decision to make first: **subfolder `/ar/...`** (my recommendation: one domain keeps all authority; Google's documented preferred pattern) vs subdomain vs `ar.` domain.

| Change | File(s) | Detail |
|---|---|---|
| Locale routing | `app/[locale]/…` layout with `en` default at `/` and `ar` at `/ar` (Next `middleware.ts` rewrite) | `<html lang dir>` per locale; `dir="rtl"` for Arabic. |
| Product schema fields | `product/schema.ts`, `product/model.ts` | Add `nameAr`, `descriptionAr`, `slug`, `slugAr`, `categories[]` (already typed in UI, missing in schema), `seoTitle/seoTitleAr`, `seoDescription/seoDescriptionAr` (optional overrides). Migration script in `scripts/` to backfill slugs from names. |
| Admin form | `product/ui/*` | Fields for the above; slug auto-generated, editable. |
| Slug routes + 301 | `app/product/[slug]/page.tsx` (+ `/ar/product/[slugAr]`) | Lookup by slug, fallback by ObjectId → `permanentRedirect` to slug. Old links in WhatsApp/Instagram keep working. |
| hreflang | `generateMetadata` `alternates.languages` on every page: `en-EG`, `ar-EG`, `x-default` | Sitemap emits both URLs with `alternates`. |
| Category pages | `app/[locale]/shop/[category]/page.tsx` | `/shop/pull-up-bars`, `/ar/shop/عقلة-حائط` (or transliterated slug — decision). Each = h1 + 150–300 words + product grid + FAQ. |
| Product JSON-LD | `app/product/[slug]/page.tsx` | `Product` + `Offer` (EGP), `BreadcrumbList`. |
| Breadcrumbs everywhere | `components/ui/breadcrumb` (exists) | Home → Shop → Category → Product; matches BreadcrumbList schema. |
| Nav language switch | `app/sections/Nav.tsx` | EN/AR toggle preserving current page. |

**Content you (or Dr. Alkady) provide:** Arabic names + 2–3 sentence Arabic descriptions per product (5 products = one afternoon), category intros (4 × 2 languages).

### Phase 3 — Content & authority engine (Weeks 3–10, ongoing) · impact: compounding

| Asset | Why | Format | Effort |
|---|---|---|---|
| `/blog` (or `/guides`) route, MDX or Mongo-backed | Content is how you rank for informational + comparison terms | `app/[locale]/guides/[slug]` with `Article` schema, author = Dr. Alkady (Person schema linked from About) | 1 dev day, then writing |
| "How to install a wall pull-up bar in Egyptian (brick/concrete) walls" — AR + EN + video | Highest-converting informational query; nobody in Egypt does it well | Guide + YouTube embed + product CTA | half day |
| "Door bar vs wall bar vs free-standing — which one for your flat?" | Captures comparison intent before marketplaces | Comparison page | half day |
| "Beginner calisthenics home setup under X EGP" | Ties products to a plan; brand voice | Guide | half day |
| Product FAQ blocks (weight limit, wall type, delivery time, installation service, warranty) | `FAQPage` schema, long-tail queries, fewer WhatsApp questions | On each product page, from admin | 1 dev day + content |
| Customer reviews with photos | `aggregateRating` → stars in SERP; trust vs marketplaces | New `Review` model + admin moderation, or embed Google reviews | 1–2 dev days |
| About page rebuild | E-E-A-T: Dr. Alkady bio, PhD, coaching record, workshop/factory photos | `Person` schema, `sameAs` to his socials | half day |
| Google Business Profile | Local pack for "معدات كاليسثينكس القاهرة", reviews | Off-site setup | 1 hour |
| Google Merchant Center — free product listings | Egypt/EGP supported; your products show in Google Shopping tab for free once feed + Product schema exist | Product feed endpoint `app/api/feed/google/route.ts` (XML) | 1 dev day |
| Backlinks | Egyptian fitness pages, gyms, university sports depts, calisthenics community accounts, athletes Dr. Alkady coached; PR angle "Egyptian-made calisthenics equipment" | Outreach list + one link-worthy asset (installation guide / bar-strength test video) | ongoing |
| YouTube + Instagram + TikTok | Second-largest search surface in Egypt; videos rank in Google | Post → embed on product/guide pages | ongoing |

### Phase 4 — Middle East expansion (after Egypt is measurably working, ~month 4+)

- **Structure:** keep one domain, add country folders only when you can *ship and price* there: `/sa/ar`, `/sa/en`, `/ae/ar`, `/ae/en` (or `/ar-sa`, `/en-ae`). hreflang per country-language; `x-default` → `/`.
- **Commerce prerequisites:** SAR/AED pricing (`data/checkout-cities.ts` → country-aware), shipping partner, VAT display (KSA 15%, UAE 5%), local payment (Mada/Tabby/Tamara are expected in KSA).
- **Merchant Center:** Saudi Arabia (SAR) and UAE (AED) are supported and have the Shopping tab; Kuwait (KWD) supported; Qatar not listed as of today.
- **Content:** Gulf-dialect Arabic titles where wording differs; local landing pages "معدات كاليسثينكس الرياض / جدة / دبي".
- **Authority:** local reviews, Gulf calisthenics community/athletes, Saudi Sports for All Federation ecosystem.
- **Don't** launch Gulf pages before logistics exist — Google punishes pages that promise a market you can't serve (high bounce, no conversions).

---

## 6. Measurement — how we'll know it's working

| Milestone | Metric (Google Search Console unless noted) | Target |
|---|---|---|
| End week 1 | Indexed pages = all products + shop + categories; 0 "crawled – not indexed" for products; robots shows sitemap | ✓ |
| End month 1 | Impressions for Arabic queries > 0 (today ≈ 0) | any → then growth |
| End month 2 | Ranking (avg position ≤ 10) for: calisthenics equipment egypt, parallettes egypt, wall parallel bar egypt, متوازي كاليسثينكس | 4/4 |
| End month 3 | عقلة حائط / عقلة حائط للبيع in top 10; product rich results (price/stock) showing; Merchant free listings live | ✓ |
| Ongoing | Organic sessions (GA4) month-over-month, organic-assisted orders (GA4 purchase event already? — to verify), PageSpeed mobile ≥ 80 | +20%/mo early |

Set up: GSC (domain property via Cloudflare DNS TXT), GA4 with `purchase` event fired on `/thankyou`, PageSpeed Insights baseline before Phase 1 so we can show the delta.

---

## 7. Decisions I need from you (reply with numbers)

1. **AI crawlers:** allow GPTBot/ClaudeBot/Perplexity/Meta (my rec) or keep Cloudflare's block?
2. **Arabic URL style:** real Arabic slugs (`/ar/product/عقلة-حائط`) or transliterated (`/ar/product/wall-pull-up-bar`)? Rec: Arabic slugs for `/ar` (matches queries, Google handles UTF-8 fine).
3. **Brand spelling** in titles: "Unlimited SW" (rec) or "UNLIMITED-SW"?
4. **Categories** (rec 4): Pull-up bars · Dip & parallel bars · Parallettes · Accessories/Rings — confirm or edit.
5. **Content owner:** who writes Arabic product/guide copy — Dr. Alkady, you, or I draft and he corrects?
6. **Blog storage:** MDX files in repo (simple, dev edits) or Mongo + admin editor (non-dev edits)? Rec: Mongo, since admin already exists.
7. **Assets:** send real phone, Instagram/Facebook/TikTok/YouTube URLs, logo file, one hero image for OG.
8. **Go for Phase 1?** If yes I'll list exact files/functions for approval before touching anything.

---

## Sources

- Google search share Egypt ≈ 96%: [Statcounter](https://gs.statcounter.com/search-engine-market-share/all/egypt) · mobile share/bilingual behaviour: [SEO in Egypt guide](https://migazette.com/seo-in-egypt/), [Statcounter mobile](https://gs.statcounter.com/search-engine-host-market-share/mobile/egypt)
- Merchant Center supported countries/currencies (Egypt EGP, KSA SAR, UAE AED, Kuwait KWD): [Google Merchant Center Help](https://support.google.com/merchants/answer/160637?hl=en) · free listings: [Google](https://support.google.com/merchants/answer/13889434?hl=en)
- Cloudflare managed robots.txt behaviour: [Cloudflare docs](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/), [community report](https://community.cloudflare.com/t/cf-managed-robots-txt-suddenly-fully-overides-origins-robots-txt/833999)
- Egypt SERPs observed: [Amazon.eg pull-up bars](https://www.amazon.eg/-/en/b?ie=UTF8&node=21858562031), [Noon](https://www.noon.com/egypt-en/sports-and-outdoors/exercise-and-fitness/strength-training-equipment/strength-training-equipments/pull-up-bars/), [Jumia عقلة حائط](https://www.jumia.com.eg/ar/mlp-k-wall-mount-bar/), [Dubizzle](https://www.dubizzle.com.eg/en/books-sports-hobbies/sports-equipment/q-%D8%B9%D9%82%D9%84%D8%A9-%D8%AD%D8%A7%D8%A6%D8%B7/), [Athlete Home](https://athletehome-eg.com/products/wall-chin-up-bar-copy), [Kanteen](https://www.kanteen.store/products/wall-mount-multifunctional-pull-up-bar), [Raneen](https://www.raneen.com/ar/iron-wall-mount-pull-up-bar-for-upper-body-training-up-to-150-kg-black)
- Gulf competitors: [GORNATION](https://www.gornation.com/), [Sun & Sand Sports KSA](https://en-sa.sssports.com/sports/fitness/equipment), [1441 Fitness](https://1441fitness.com/), [Aldowly](https://aldowly.com/en/categories/1463315/fitness-equipment-training-machines), [Ubuy SA](https://www.ubuy.com.sa/en/search/?q=parallel+bars)
