import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '../../../../lib/withDb';
import { apiCache, invalidateCitiesCache } from '../../../../lib/cache';
import { cacheKeys } from '../../../../lib/cache-keys';
import { CACHE_TTL } from '../../../../lib/cache-ttl';
import { requireAdmin } from '../../../../lib/requireAdmin';
import CityPricing from '../../../../models/cityPricing';

export const GET = withDb(async (request: NextRequest) => {
  // Shipping and COD configuration is internal pricing data, not public.
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const productIds = searchParams.get('productIds')?.split(',').filter(Boolean) ?? [];

  // Serve from cache when no product-specific pricing needed
  if (productIds.length === 0) {
    const cached = apiCache.get<any[]>(cacheKeys.cities.all());
    if (cached) {
      return NextResponse.json({ success: true, cities: cached, cached: true });
    }
  }

  const raw = await CityPricing.find({})
    .select('governorate cityName shippingCost codFee isActive')
    .sort({ governorate: 1, cityName: 1 })
    .lean();

  // Deduplicate by governorate
  const govMap: Record<string, any> = {};
  for (const city of raw) {
    const key = (city.governorate || '').trim();
    if (!key) continue;
    if (!govMap[key]) {
      govMap[key] = {
        _id:          city._id,
        governorate:  city.governorate,
        cityName:     key,
        shippingCost: city.shippingCost,
        codFee:       city.codFee,
        isActive:     city.isActive,
        productPricing: {},
      };
    }
  }

  // Attach product-specific pricing if productIds provided
  if (productIds.length > 0) {
    const Product = (await import('@/product/model')).default;
    const products = await Product.find(
      { _id: { $in: productIds } },
      { cityPricing: 1 }
    ).lean() as any[];

    for (const product of products) {
      const pid = product._id.toString();
      for (const cp of (product.cityPricing || [])) {
        const gov = (cp.governorate || '').trim();
        if (govMap[gov]) {
          if (!govMap[gov].productPricing) govMap[gov].productPricing = {};
          govMap[gov].productPricing[pid] = {
            price:        cp.price,
            shippingCost: cp.shippingCost,
            codFee:       cp.codFee,
            isActive:     cp.isActive,
          };
        }
      }
    }
  }

  const cities = Object.values(govMap);

  // Only cache when no product-specific context
  if (productIds.length === 0) {
    apiCache.set(cacheKeys.cities.all(), cities, CACHE_TTL.CITIES);
  }

  return NextResponse.json({ success: true, cities });
});

export const POST = withDb(async (request: NextRequest) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await request.json();
  const { cityName, governorate, shippingCost, codFee, isActive } = body;
  
  if (!cityName || !governorate || shippingCost === undefined || codFee === undefined) {
    return NextResponse.json(
      { success: false, error: 'City name, governorate, shipping cost, and COD fee are required' },
      { status: 400 }
    );
  }
  
  const existingCity = await CityPricing.findOne({ 
    cityName: cityName.trim().toLowerCase() 
  });
  
  if (existingCity) {
    return NextResponse.json(
      { success: false, error: 'City already exists' },
      { status: 400 }
    );
  }
  
  const newCity = new CityPricing({
    cityName: cityName.trim(),
    governorate: governorate.trim(),
    shippingCost: Number(shippingCost),
    codFee: Number(codFee),
    isActive: isActive !== false
  });
  
  const savedCity = await newCity.save();
  
  invalidateCitiesCache();
  
  return NextResponse.json({
    success: true,
    city: savedCity,
    message: 'City created successfully'
  });
});

export const PUT = withDb(async (request: NextRequest) => {
  const authError = await requireAdmin();
  if (authError) return authError;

  return NextResponse.json({
    success: false,
    error: 'This endpoint is deprecated. Use /api/admin/cities/global-defaults for global defaults or /api/admin/products/[id]/city-pricing for product-specific rates.',
    deprecated: true
  }, { status: 400 });
});
