import { MetadataRoute } from 'next';
import dbConnect from '../lib/mongodb';
import Product from '../models/product';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://unlimited-sw.com';
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/cart`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/checkout`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/refund`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    await dbConnect();
    const products = await Product.find({ isActive: true }).select('_id updatedAt').lean();
    
    const productPages: MetadataRoute.Sitemap = products.map((product: any) => ({
      url: `${baseUrl}/product/${product._id.toString()}`,
      lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...staticPages, ...productPages];
  } catch (error) {
    console.error('Error generating sitemap for products:', error);
    return staticPages;
  }
}
