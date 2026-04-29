# Unlimited SW — E-Commerce Platform

> **Production-hardened Next.js App Router storefront built for calisthenics equipment sales in Egypt.**

---

## 🏗️ Architecture Overview

```
app/
├── api/
│   ├── products/              ← Public storefront endpoints
│   │   ├── route.ts           ← GET all/featured products (thin shell)
│   │   ├── [id]/route.ts      ← GET single product (public)
│   │   └── batch/route.ts     ← POST batch product fetch (checkout pricing)
│   └── admin/
│       └── products/
│           ├── route.ts       ← GET (paginated) + POST create (admin)
│           └── [id]/route.ts  ← GET / PUT / PATCH / DELETE (admin)
├── checkout/
│   ├── hooks/
│   │   ├── useCheckoutPricing.ts  ← City pricing, subtotal, COD, promos
│   │   └── useCheckoutForm.ts     ← Form state, validation, S3 upload
│   └── types.ts               ← Shared checkout TypeScript interfaces
└── sections/
    └── Products.tsx           ← Next.js Image + Link, semantic HTML, memoized stock

lib/
├── mongodb.ts         ← Singleton Mongoose connection + event listeners
├── withDb.ts          ← DB middleware wrapper (replaces inline dbConnect calls)
├── cache.ts           ← In-memory apiCache + productCache
├── cache-ttl.ts       ← Named TTL constants (PRODUCTS=5m, PRODUCT_DETAIL=10m, ADMIN=5s)
├── cache-keys.ts      ← Type-safe cache key builders
├── cache-warmer.ts    ← Pre-loads products cache on server start
├── errors.ts          ← Typed error classes (NotFoundError, ValidationError, DatabaseError)
└── schemas/
    └── product.schema.ts  ← Zod create + update schemas

repositories/
└── product.repository.ts  ← IProductRepository interface + MongoProductRepository

services/
└── product.service.ts     ← Business logic, cache orchestration, transaction management

models/
└── product.ts         ← Mongoose schema + text/compound indexes

contexts/
└── CartContext.tsx    ← Cart state management
```

---

## 🔄 Request Flow

```
HTTP Request
    │
    ▼
Route Handler (thin shell)
│  withDb()          → ensures DB connected, maps typed errors → HTTP status
│  Zod.safeParse()   → validates input, returns 400 with details on failure
    │
    ▼
Service Layer  (services/product.service.ts)
│  Cache check       → apiCache.get(cacheKeys.xxx)
│  Business logic    → default city pricing, featured fallback
│  Cache write       → apiCache.set(key, data, CACHE_TTL.xxx)
│  Cache invalidation → invalidateProductCache()
    │
    ▼
Repository Layer  (repositories/product.repository.ts)
│  IProductRepository interface (swappable)
│  MongoProductRepository implementation
│  All Mongoose calls live here only
    │
    ▼
MongoDB Atlas
```

---

## 📦 New Files Added

| File | Purpose |
|---|---|
| `lib/errors.ts` | Typed errors with HTTP status codes |
| `lib/withDb.ts` | Middleware wrapper replacing inline `dbConnect()` |
| `lib/cache-ttl.ts` | Named TTL constants |
| `lib/cache-keys.ts` | Type-safe cache key builders |
| `lib/schemas/product.schema.ts` | Zod create + update validation schemas |
| `repositories/product.repository.ts` | `IProductRepository` interface + Mongo impl |
| `services/product.service.ts` | All business logic and cache orchestration |
| `app/api/products/batch/route.ts` | Batch product fetch for checkout pricing |
| `app/checkout/hooks/useCheckoutPricing.ts` | Client-side pricing hook |
| `app/checkout/hooks/useCheckoutForm.ts` | Client-side form + upload hook |
| `app/checkout/types.ts` | Shared checkout interfaces |

---

## 🔐 Environment Variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `NEXTAUTH_URL` | Base URL for NextAuth (also used for SSR fetches) |
| `NEXT_PUBLIC_BASE_URL` | Public base URL (used in SSR product fetch) |
| `ALKADY_AWS_REGION` | AWS region for S3 |
| `ALKADY_AWS_ACCESS_KEY_ID` | AWS access key |
| `ALKADY_AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `ALKADY_AWS_S3_BUCKET_NAME` | S3 bucket name |

---

## 🚀 SEO & Performance

### Metadata
- `app/page.tsx` exports full `metadata` (title, description, keywords, OG, Twitter, canonical)
- Product pages inject `Product` + `BreadcrumbList` JSON-LD structured data via `<script type="application/ld+json">`

### Images
- `app/sections/Products.tsx` uses `next/image` (`fill`, `sizes`, `priority` for first 3 images)
- `<img>` tags eliminated from product grid

### Navigation
- `window.location.href` eliminated — all navigation uses `next/link` (prefetch enabled)

### Lazy Loading
- `FeedbackForm` lazy-loaded via `next/dynamic` on the homepage (`ssr: false`)

### Sitemap & Robots
- `app/sitemap.ts` — dynamic, DB-driven, includes all active product URLs
- `app/robots.ts` — blocks `/admin/` and `/api/`, points to sitemap

### Caching Strategy

| Layer | TTL | Key |
|---|---|---|
| Public product list | 5 min | `products:all` |
| Featured products | 5 min | `products:featured` |
| Product detail | 10 min | `product:detail:{id}` |
| Admin list | 5 sec | `products:admin:{page}-{limit}-{search}` |
| Cache warmer | on boot | pre-loads all + featured |

Manual invalidation via `invalidateProductCache(id?)` is called on every create/update/delete.

---

## 🗄️ Database

### Indexes

```ts
ProductSchema.index({ name: 'text', description: 'text' }); // Full-text search
ProductSchema.index({ isActive: 1, order: 1 });              // Active product listing
ProductSchema.index({ isActive: 1, order: 1 }); // Regular listing
```

### Connection
- Singleton pattern with global cache (survives Next.js hot reloads in dev)
- Event listeners: `connected`, `error`, `disconnected`
- `serverSelectionTimeoutMS: 10_000` (scaled for production traffic)

---

## 🛡️ Validation

All admin write endpoints use **Zod** schemas:

```ts
// POST /api/admin/products
const parsed = createProductSchema.safeParse(body);
if (!parsed.success) return 400 + parsed.error.flatten();

// PUT /api/admin/products/[id]
const parsed = updateProductSchema.safeParse(body);
```

---

## ⚙️ Running Locally

```bash
npm install
npm run dev     # Development server with HMR
npm run build   # Production build
npm run start   # Production server
```

---

## 📋 Checkout Flow

1. User visits `/checkout`
2. `useCheckoutPricing` fetches city list → builds per-item pricing via `/api/products/batch`
3. `useCheckoutForm` manages form state, validates Egyptian phone + email format via RegEx
4. File upload in `handleFileChange` → instantly pushed to S3, URL stored in form state
5. On submit → POST to `/api/checkout` with pre-uploaded file URL (no blocking upload step)

---

## 🏪 Admin

- `/admin` — Dashboard with order stats
- `/admin/products` — Product CRUD (paginated, searchable, drag-to-reorder)
- `/admin/orders` — Order management
- `/admin/collections` — Dynamic collection management (S3 image upload)

---

> Built with Next.js 14 App Router · TypeScript · MongoDB Atlas · AWS S3 · Zod · Mongoose · Framer Motion
