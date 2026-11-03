/**
 * The home page's featured product (product/featured.ts): shown only when
 * it can be bought, always in the page's language, nothing typed by hand.
 */
jest.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
jest.mock('@/product/queries', () => ({ productQueries: { findById: jest.fn() } }));

import { featuredView, inStock } from '@/product/featured';
import type { Product } from '@/product/model';

const bar = (over: Partial<Product> = {}): Product =>
  ({
    _id: '69dfa9bdfd949589cc4ca6e4',
    name: 'Wall-mounted pull-up bar',
    nameAr: 'عقلة حائط',
    slug: 'wall-mounted-pull-up-bar',
    slugAr: 'عقلة-حائط',
    price: 3890,
    originalPrice: 4200,
    mainImage: 'https://example.com/a.webp',
    images: ['https://example.com/b.webp', 'https://example.com/c.webp'],
    description: '• Heavy-duty 3 mm steel\n• Fits any solid wall',
    descriptionAr: 'حديد ٣ مم',
    promoCode: '',
    variants: [],
    stock: 4,
    isActive: true,
    order: 0,
    ...over,
  }) as Product;

describe('featured product', () => {
  it('shows the product itself in English', () => {
    const v = featuredView(bar(), 'en')!;
    expect(v.name).toBe('Wall-mounted pull-up bar');
    expect(v.price).toBe(3890);
    expect(v.originalPrice).toBe(4200);
    expect(v.description).toBe('Heavy-duty 3 mm steel');
    expect(v.images).toEqual(['https://example.com/a.webp', 'https://example.com/b.webp']);
    expect(v.href).toBe('/product/wall-mounted-pull-up-bar');
  });

  it('shows the Arabic name, text and address on the Arabic page', () => {
    const v = featuredView(bar(), 'ar')!;
    expect(v.name).toBe('عقلة حائط');
    expect(v.description).toBe('حديد ٣ مم');
    expect(v.href).toBe('/ar/product/عقلة-حائط');
  });

  it('falls back to English when the Arabic is missing', () => {
    expect(featuredView(bar({ nameAr: '' }), 'ar')!.name).toBe('Wall-mounted pull-up bar');
  });

  it('shows nothing for no product, a hidden one, or one sold out', () => {
    expect(featuredView(null, 'en')).toBeNull();
    expect(featuredView(bar({ isActive: false }), 'en')).toBeNull();
    expect(featuredView(bar({ stock: 0 }), 'en')).toBeNull();
  });

  it('counts variants: in stock while any one has a piece left', () => {
    const variants = [{ name: 'Gray', stock: 0 }, { name: 'Black', stock: 2 }];
    expect(inStock({ stock: 0, variants })).toBe(true);
    expect(inStock({ stock: 5, variants: [{ name: 'Gray', stock: 0 }] })).toBe(false);
    expect(featuredView(bar({ stock: 2, variants }), 'en')!.options).toEqual(['Black']);
  });

  it('hides a discount that is not a discount, and needs a photo', () => {
    expect(featuredView(bar({ originalPrice: 3000 }), 'en')!.originalPrice).toBeNull();
    expect(featuredView(bar({ mainImage: '', images: [] }), 'en')).toBeNull();
  });

  it('one photo means no slider', () => {
    expect(featuredView(bar({ images: [] }), 'en')!.images).toEqual(['https://example.com/a.webp']);
  });
});
