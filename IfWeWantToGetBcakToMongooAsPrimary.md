# How to Revert Back to MongoDB (Primary Mode)

When MongoDB Altas comes back online, you will need to switch the files back to checking the database *first*, rather than bypassing it entirely. 

Follow this checklist to safely restore your app back to dynamic fetching.

---

### 1. `app/product/[id]/page.tsx`
Currently, this file instantly returns hardcoded products without pinging the API. 
**To Revert:** Restore the standard `fetch` logic so that it asks your API route first.
```typescript
// ─── Server-side data fetch ───────────────────────────────────────────────────
async function fetchProduct(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://unlimited-sw.com';

  try {
    const res = await fetch(`${baseUrl}/api/products/${id}`, {
      next: { revalidate: 600, tags: [`product-${id}`, 'products'] },
    });
    if (!res.ok) return getStaticProductById(id); // ← keep this line untouched as a fallback!
    const data = await res.json();
    return data.product ?? getStaticProductById(id);
  } catch {
    return getStaticProductById(id);
  }
}
```
*(Do the same restoration pattern for `fetchRelatedProducts` in the same file).*

### 2. `app/api/products/[id]/route.ts` & `app/api/products/route.ts`
Currently, these have been gutted to only return `getStaticActiveProducts()`.
**To Revert:** Re-introduce your `product.service.ts` calls inside the handlers. E.g., `const products = await productService.getActiveProducts(featured);`

### 3. `app/api/products/batch/route.ts`
Currently, it filters the `STATIC_PRODUCTS` directly.
**To Revert:** Tell it to query MongoDB for the `ids` array using Mongoose (`await Product.find({ _id: { $in: ids } })`), and *then* fallback to `STATIC_PRODUCTS.filter()` if it fails.

### 4. `app/api/checkout/cities/route.ts`
Currently, it instantly returns `STATIC_CITIES`.
**To Revert:** Restore the `withDb` wrapper and fetch from the MongoDB City Model (`await City.find({ isActive: true })`).

### 5. What NOT to change
The architectural improvements we added to prevent checkout errors and mapping issues are universally beneficial and should remain in your code permanently:
- Keep the `STOCK` management toggle in `data/products.ts`.
- Keep the `resolveProductId` and `getProductPricing` helpers we built into `data/checkout-cities.ts` & `useCheckoutPricing.ts`. These now guarantee checkout will never crash, even during future database upgrades.
- Keep the slug generation logic inside your frontend map structures (`nameToSlug`).

---
**Shortcut:** Since you use Git, the easiest way to perform Steps 1–4 is simply to look at your commit history for the files modified during the "Emergency Fallback Implementation", and copy-paste the `try/catch` code blocks you previously had in those specific files.
