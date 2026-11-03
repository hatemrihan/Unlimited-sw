/**
 * ============================================================
 * unlimited-sw · shopdb · products.ts
 * JOB: the catalogue in Supabase, behind the same ProductQueries interface
 *      the store has used since August — plus the few product reads that
 *      skip the interface today (stock, the feed, the sitemap).
 * USED BY: product/queries.ts (chooses this when SHOP_DB=supabase), the
 *          stock and cart routes, the feed, the sitemap.
 * DEPENDS ON: shop_products, shop_variants (service role), and
 *             adjust_shop_stock (20261017150000).
 * RULES: · ids in may be OLD Mongo ids (a cart saved last month) or
 *          uuids (a product made after the move); both resolve
 *        · stock is never written here except through adjust_shop_stock
 * ============================================================
 */

import type { Product } from '@/product/model';
import type { CreateProductInput, UpdateProductInput } from '@/product/schema';
import type { ProductQueries } from '@/product/queries';

import { shopDb } from './client';
import { isLegacyId, isUuid, PRODUCT_SELECT, productToRow, rowToProduct } from './map';

function fail(error: { message?: string } | null, what: string): never {
  throw new Error(`[shopdb] ${what}: ${error?.message ?? 'unknown error'}`);
}

/** `.or()` for "this id, old or new". Ids are checked first, so nothing else reaches the filter. */
function idFilter(ids: string[]): string | null {
  const uuids = ids.filter(isUuid);
  const legacy = ids.filter(isLegacyId);
  const parts = [
    uuids.length ? `id.in.(${uuids.join(',')})` : '',
    legacy.length ? `legacy_id.in.(${legacy.join(',')})` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(',') : null;
}

/**
 * The admin's product search arrives as the Mongo query product/actions.ts
 * has always built ({ $or: [{ name: { $regex } }, …] }). The text is taken
 * out of it, so the actions file needs no change.
 */
export function searchTextOf(query: object): string {
  const or = (query as any)?.$or;
  const regex = Array.isArray(or) ? or[0]?.name?.$regex : undefined;
  return typeof regex === 'string' ? regex.replace(/[%_,()]/g, '').trim().slice(0, 80) : '';
}

export class SupabaseProductQueries implements ProductQueries {
  async findAllActive(): Promise<Product[]> {
    const { data, error } = await shopDb()
      .from('shop_products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .order('price');
    if (error) fail(error, 'active products');
    return (data ?? []).map(rowToProduct);
  }

  async findById(id: string): Promise<Product | null> {
    const filter = idFilter([id]);
    if (!filter) return null;
    const { data, error } = await shopDb().from('shop_products').select(PRODUCT_SELECT).or(filter).maybeSingle();
    if (error) fail(error, 'product by id');
    return data ? rowToProduct(data) : null;
  }

  async findBySlug(slug: string, locale: 'en' | 'ar'): Promise<Product | null> {
    const { data, error } = await shopDb()
      .from('shop_products')
      .select(PRODUCT_SELECT)
      .eq(locale === 'ar' ? 'slug_ar' : 'slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) fail(error, 'product by slug');
    return data ? rowToProduct(data) : null;
  }

  async currentSlugFor(oldSlug: string, locale: 'en' | 'ar'): Promise<string | null> {
    const { data, error } = await shopDb()
      .from('shop_product_slugs')
      .select('product:shop_products(slug, slug_ar, is_active)')
      .eq('locale', locale)
      .eq('slug', oldSlug)
      .maybeSingle();
    if (error) fail(error, 'old product address');
    const product = (data as { product?: { slug: string | null; slug_ar: string | null; is_active: boolean } | null } | null)?.product;
    if (!product?.is_active) return null;
    return (locale === 'ar' ? product.slug_ar || product.slug : product.slug) ?? null;
  }

  async findByCategory(category: string): Promise<Product[]> {
    const { data, error } = await shopDb()
      .from('shop_products')
      .select(PRODUCT_SELECT)
      .eq('category', category)
      .eq('is_active', true)
      .order('price');
    if (error) fail(error, 'products by category');
    return (data ?? []).map(rowToProduct);
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    const filter = idFilter(ids);
    if (!filter) return [];
    const { data, error } = await shopDb().from('shop_products').select(PRODUCT_SELECT).or(filter);
    if (error) fail(error, 'products by ids');
    return (data ?? []).map(rowToProduct);
  }

  async findRelated(excludeId: string, limit: number): Promise<Product[]> {
    let q = shopDb().from('shop_products').select(PRODUCT_SELECT).eq('is_active', true).order('sort_order').limit(limit);
    if (isUuid(excludeId)) q = q.neq('id', excludeId);
    else if (isLegacyId(excludeId)) q = q.or(`legacy_id.is.null,legacy_id.neq.${excludeId}`);
    const { data, error } = await q;
    if (error) fail(error, 'related products');
    return (data ?? []).map(rowToProduct);
  }

  async findActivePage(skip: number, limit: number): Promise<Product[]> {
    const { data, error } = await shopDb()
      .from('shop_products')
      .select(PRODUCT_SELECT)
      .eq('is_active', true)
      .order('price')
      .range(skip, skip + limit - 1);
    if (error) fail(error, 'product page');
    return (data ?? []).map(rowToProduct);
  }

  async countActive(): Promise<number> {
    const { count, error } = await shopDb()
      .from('shop_products')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    if (error) fail(error, 'count');
    return count ?? 0;
  }

  async findAdminPage(query: object, skip: number, limit: number): Promise<Product[]> {
    const text = searchTextOf(query);
    let q = shopDb().from('shop_products').select(PRODUCT_SELECT).order('price').range(skip, skip + limit - 1);
    if (text) q = q.or(`name.ilike.%${text}%,description.ilike.%${text}%`);
    const { data, error } = await q;
    if (error) fail(error, 'admin page');
    return (data ?? []).map(rowToProduct);
  }

  async countAdminPage(query: object): Promise<number> {
    const text = searchTextOf(query);
    let q = shopDb().from('shop_products').select('id', { count: 'exact', head: true });
    if (text) q = q.or(`name.ilike.%${text}%,description.ilike.%${text}%`);
    const { count, error } = await q;
    if (error) fail(error, 'admin count');
    return count ?? 0;
  }

  /**
   * A new product, and its variants as rows. The variants' stock starts as
   * given (a new product is stocked when it is made); after that, stock
   * moves only through adjust_shop_stock.
   */
  async create(data: CreateProductInput): Promise<any> {
    const input = data as unknown as Product;
    const row = { ...productToRow(input), stock: (input.variants?.length ? 0 : Number(input.stock) || 0) };
    const { data: created, error } = await shopDb().from('shop_products').insert(row).select('id').single();
    if (error) fail(error, 'create product');
    if (input.variants?.length) {
      const { error: vErr } = await shopDb()
        .from('shop_variants')
        .insert(
          input.variants.map((v, i) => ({
            product_id: created.id,
            name: v.name.trim(),
            stock: Number(v.stock) || 0,
            price: v.price ?? null,
            images: v.images ?? [],
            videos: v.videos ?? [],
            sort_order: i,
          }))
        );
      if (vErr) fail(vErr, 'create variants');
    }
    return this.findById(created.id);
  }

  /**
   * Saves the product's fields. Variants are matched BY NAME: a kept name
   * keeps its stock (product/actions.ts already took stock out of the
   * form), a new name starts at 0, a removed name is deleted.
   */
  async updateById(id: string, data: UpdateProductInput): Promise<any> {
    const uuid = await resolveProductUuid(id);
    if (!uuid) return null;
    const input = data as unknown as Partial<Product>;
    const { error } = await shopDb().from('shop_products').update(productToRow(input)).eq('id', uuid);
    if (error) fail(error, 'update product');

    if (Array.isArray(input.variants)) {
      const { data: current, error: cErr } = await shopDb().from('shop_variants').select('id, name').eq('product_id', uuid);
      if (cErr) fail(cErr, 'read variants');
      const wanted = new Map(input.variants.map((v, i) => [v.name.trim(), { v, i }]));
      const gone = (current ?? []).filter((c: any) => !wanted.has(c.name)).map((c: any) => c.id);
      if (gone.length) {
        const { error: dErr } = await shopDb().from('shop_variants').delete().in('id', gone);
        if (dErr) fail(dErr, 'remove variants');
      }
      const existing = new Set((current ?? []).map((c: any) => c.name));
      for (const [name, { v, i }] of wanted) {
        const fields = { price: v.price ?? null, images: v.images ?? [], videos: v.videos ?? [], sort_order: i };
        const { error: wErr } = existing.has(name)
          ? await shopDb().from('shop_variants').update(fields).eq('product_id', uuid).eq('name', name)
          : await shopDb().from('shop_variants').insert({ product_id: uuid, name, stock: 0, ...fields });
        if (wErr) fail(wErr, 'save variant');
      }
    }
    return this.findById(uuid);
  }

  async deleteById(id: string): Promise<any> {
    const uuid = await resolveProductUuid(id);
    if (!uuid) return null;
    const before = await this.findById(uuid);
    const { error } = await shopDb().from('shop_products').delete().eq('id', uuid);
    if (error) fail(error, 'delete product');
    return before;
  }
}

/** Old id or new → the row's uuid, or null when there is no such product. */
export async function resolveProductUuid(id: string): Promise<string | null> {
  const map = await resolveProductUuids([id]);
  return map.get(id) ?? null;
}

/** Many at once, for a basket: incoming id → uuid, and uuid → public id. */
export async function resolveProductUuids(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const filter = idFilter([...new Set(ids)]);
  if (!filter) return out;
  const { data, error } = await shopDb().from('shop_products').select('id, legacy_id').or(filter);
  if (error) fail(error, 'resolve ids');
  for (const row of data ?? []) {
    out.set(row.id, row.id);
    if (row.legacy_id) out.set(row.legacy_id, row.id);
  }
  return out;
}

/** uuid → the id the storefront shows (old Mongo id when there is one). */
export async function publicIdsOf(uuids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const wanted = [...new Set(uuids.filter(isUuid))];
  if (!wanted.length) return out;
  const { data, error } = await shopDb().from('shop_products').select('id, legacy_id').in('id', wanted);
  if (error) fail(error, 'public ids');
  for (const row of data ?? []) out.set(row.id, row.legacy_id ?? row.id);
  return out;
}

/**
 * The admin's stock edit through the logged, locked door. `expected` is the
 * number the page showed; STOCK_CONFLICT when somebody bought in between.
 */
export async function adjustStock(
  productId: string,
  change: { variantName?: string | null; delta?: number; expected?: number; next?: number }
): Promise<any> {
  const uuid = await resolveProductUuid(productId);
  if (!uuid) throw new Error('PRODUCT_UNAVAILABLE');
  const { data, error } = await shopDb().rpc('adjust_shop_stock', {
    p_product_id: uuid,
    p_variant_name: change.variantName ?? null,
    p_delta: change.delta ?? null,
    p_expected: change.expected ?? null,
    p_next: change.next ?? null,
  });
  if (error) throw new Error(error.message.trim());
  return data;
}

/** Writes one product's per-governorate shipping/COD list (the admin's city-pricing page). */
export async function saveCityPricing(productId: string, cityPricing: unknown[]): Promise<void> {
  const uuid = await resolveProductUuid(productId);
  if (!uuid) throw new Error('PRODUCT_UNAVAILABLE');
  const { error } = await shopDb().from('shop_products').update({ city_pricing: cityPricing }).eq('id', uuid);
  if (error) fail(error, 'city pricing');
}

/** Every active product's public URL bits, for the sitemap and the feed. */
export async function activeProductsForListing(): Promise<Product[]> {
  return new SupabaseProductQueries().findAllActive();
}
