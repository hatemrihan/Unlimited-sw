import { MetadataRoute } from 'next';
import dbConnect from '../lib/mongodb';
import Product from '@/product/model';
import { CATEGORIES, CATEGORY_KEYS } from '@/product/categories';
import { listCoachUsernames } from '@/coaches/api';

const baseUrl = 'https://unlimited-sw.com';

/**
 * Both language versions of one page, as a single sitemap entry.
 *
 * Google wants the alternates declared per URL and symmetric. Building the pair
 * here rather than at each call site means an entry cannot be added in one
 * language and forgotten in the other.
 */
function bilingual(
  enPath: string,
  arPath: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number,
  lastModified: Date = new Date()
): MetadataRoute.Sitemap {
  const enUrl = `${baseUrl}${enPath === '/' ? '' : enPath}`;
  const arUrl = `${baseUrl}${arPath}`;
  const languages = { 'en-EG': enUrl, 'ar-EG': arUrl };

  return [
    { url: enUrl, lastModified, changeFrequency, priority, alternates: { languages } },
    { url: arUrl, lastModified, changeFrequency, priority, alternates: { languages } },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    ...bilingual('/', '/ar', 'daily', 1),
    ...bilingual('/shop', '/ar/shop', 'daily', 0.9),
    ...bilingual('/about', '/ar/about', 'monthly', 0.7),
    ...bilingual('/contact', '/ar/contact', 'monthly', 0.5),
    ...bilingual('/guides', '/ar/guides', 'weekly', 0.7),

    // The coach application page. Listed because being found by a coach
    // searching "coaching jobs Cairo" is the entire point of it living on
    // the shop. /coaches/welcome is deliberately absent — it is noindex,
    // addressed to one person who has just been approved.
    ...bilingual('/coaches/apply', '/ar/coaches/apply', 'monthly', 0.6),

    // English-only: legal pages have no Arabic version yet, and listing a URL
    // that 404s is worse than not listing it.
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/refund`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },

    // /cart and /checkout are deliberately absent — they are noindex, and asking
    // Google to crawl them wastes budget on pages that can never rank.
  ];

  const categoryPages: MetadataRoute.Sitemap = CATEGORY_KEYS.flatMap(key =>
    bilingual(`/shop/${key}`, `/ar/shop/${CATEGORIES[key].slugAr}`, 'weekly', 0.8)
  );

  // Coach pages come from the coaching platform's database, not Mongo, so they
  // get their own try/catch: that database being unreachable — or its env vars
  // simply not set on a preview deploy — must not cost the sitemap its products.
  let coachPages: MetadataRoute.Sitemap = [];
  try {
    const usernames = await listCoachUsernames();
    coachPages = usernames.flatMap(username =>
      bilingual(`/coaches/${username}`, `/ar/coaches/${username}`, 'weekly', 0.7)
    );
  } catch (error) {
    console.error('sitemap: coach lookup failed', error);
  }

  try {
    await dbConnect();
    const products = await Product.find({ isActive: true })
      .select('_id slug slugAr updatedAt')
      .lean();

    const productPages: MetadataRoute.Sitemap = products.flatMap((product: any) => {
      // Products that predate the backfill have no slug; the id URL still works
      // and redirects, so list that rather than skipping the product entirely.
      const enSlug = product.slug || product._id.toString();
      const arSlug = product.slugAr || enSlug;
      const lastModified = product.updatedAt ? new Date(product.updatedAt) : new Date();

      return bilingual(`/product/${enSlug}`, `/ar/product/${arSlug}`, 'weekly', 0.8, lastModified);
    });

    return [...staticPages, ...categoryPages, ...coachPages, ...productPages];
  } catch (error) {
    console.error('Error generating sitemap for products:', error);
    return [...staticPages, ...categoryPages, ...coachPages];
  }
}
