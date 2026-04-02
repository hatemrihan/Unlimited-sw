'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '../../../models/product';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/utils/fetchWithRetry';
import { z } from 'zod';

const ProductsResponseSchema = z.object({
  products: z.array(z.record(z.string(), z.unknown())).default([]),
  pagination: z.object({
    page: z.number().default(1),
    pages: z.number().default(1),
    total: z.number().default(0),
  }).optional()
}).passthrough();

// ─── Loading Spinner ───────────────────────────────────────────────────────────
const Spinner = ({ size = 'sm' }: { size?: 'sm' | 'xs' }) => (
  <svg
    className={`animate-spin ${size === 'xs' ? 'w-3 h-3' : 'w-4 h-4'}`}
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// ─── Per-product action loading states ────────────────────────────────────────
type ActionState = 'idle' | 'edit' | 'delete' | 'city';

// --- Stock calculation — fully typed, no `as any` ---
const getStockDisplay = (product: Product) => {
  const variantStock =
    product.variants.length > 0
      ? product.variants.reduce((sum, v) => sum + (v.stock ?? 0), 0)
      : product.stock ?? 0;

  if (variantStock > 0) {
    return (
      <div className="bg-green-900 text-green-200 px-2 py-1 rounded-full text-xs font-medium">
        In Stock
      </div>
    );
  }
  if (product.showPreorderBadge) {
    return (
      <div className="bg-blue-900 text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
        Preorder
      </div>
    );
  }
  if (product.showOutOfStockBadge) {
    return (
      <div className="bg-red-900 text-red-200 px-2 py-1 rounded-full text-xs font-medium">
        Out of Stock
      </div>
    );
  }
  return (
    <div className="bg-gray-900 text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
      No Stock
    </div>
  );
};

// --- ProductCard Memoization ---
const ProductCard = React.memo(({
  product,
  loading,
  onEdit,
  onDelete,
  onCityPrices
}: {
  product: Product;
  loading: ActionState;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onCityPrices: (p: Product) => void;
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex flex-col gap-2">
        {/* Product Image */}
        <div className="w-full flex-shrink-0" style={{ aspectRatio: '1080 / 1350' }}>
          <div className="relative w-full h-full rounded-lg overflow-hidden">
            <img
              src={product.mainImage}
              alt={product.name}
              className="w-full h-full object-cover"
              style={{ aspectRatio: '1080 / 1350' }}
              onError={(e) => { e.currentTarget.src = '/images/placeholder.png'; }}
            />
            {product.discount && product.discount > 0 ? (
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                {product.discount}% OFF
              </div>
            ) : null}
          </div>
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <div className="space-y-1">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                {product.name}
              </h3>
              <p className="text-gray-500 text-xs mb-1 line-clamp-2">
                {product.description || 'No description available'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-900 font-bold text-sm">
                {product.price.toLocaleString()} L.E
              </span>
              <div className="text-xs space-y-1">
                {getStockDisplay(product)}
                {/* Variant stock details */}
                {product.variants.length > 0 && (
                  <div className="space-y-1">
                    {product.variants.map((variant) => (
                      <div key={variant.name} className="text-gray-400 text-xs">
                        {variant.name}: {variant.stock ?? 0}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(product)}
                  disabled={loading !== 'idle'}
                  aria-label={`Edit ${product.name}`}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-300 disabled:opacity-60 text-xs font-medium transition-colors border border-blue-400/20 rounded hover:border-blue-400/40"
                >
                  {loading === 'edit' ? (
                    <Spinner size="xs" />
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M15.655 4.344a2.695 2.695 0 0 0-3.81 0l-.599.599-.009-.009-1.06 1.06.008.01-5.88 5.88a2.75 2.75 0 0 0-.805 1.944v1.922a.75.75 0 0 0 .75.75h1.922a2.75 2.75 0 0 0 1.944-.806l7.54-7.539a2.695 2.695 0 0 0 0-3.81Zm-4.409 2.72-5.88 5.88a1.25 1.25 0 0 0-.366.884v1.172h1.172c.331 0 .65-.132.883-.366l5.88-5.88-1.689-1.69Zm2.75.629.599-.599a1.195 1.195 0 1 0-1.69-1.689l-.598.599 1.69 1.689Z" clipRule="evenodd" />
                    </svg>
                  )}
                  Edit
                </button>
                <button
                  onClick={() => onDelete(product)}
                  disabled={loading !== 'idle'}
                  aria-label={`Delete ${product.name}`}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-red-400 hover:text-red-300 disabled:opacity-60 text-xs font-medium transition-colors border border-red-400/20 rounded hover:border-red-400/40"
                >
                  {loading === 'delete' ? (
                    <Spinner size="xs" />
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11.5 8.25a.75.75 0 0 1 .75.75v4.25a.75.75 0 0 1-1.5 0v-4.25a.75.75 0 0 1 .75-.75Z" />
                      <path d="M9.25 9a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 0 1.5 0v-4.25Z" />
                      <path fillRule="evenodd" d="M7.25 5.25a2.75 2.75 0 0 1 5.5 0h3a.75.75 0 0 1 0 1.5h-.75v5.45c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311c-.642.327-1.482.327-3.162.327h-.4c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311c-.327-.642-.327-1.482-.327-3.162v-5.45h-.75a.75.75 0 0 1 0-1.5h3Zm1.5 0a1.25 1.25 0 1 1 2.5 0h-2.5Zm-2.25 1.5h7v5.45c0 .865-.001 1.423-.036 1.848-.033.408-.09.559-.128.633a1.5 1.5 0 0 1-.655.655c-.074.038-.225.095-.633.128-.425.035-.983.036-1.848.036h-.4c-.865 0-1.423-.001-1.848-.036-.408-.033-.559-.09-.633-.128a1.5 1.5 0 0 1-.656-.655c-.037-.074-.094-.225-.127-.633-.035-.425-.036-.983-.036-1.848v-5.45Z" clipRule="evenodd" />
                    </svg>
                  )}
                  Delete
                </button>
              </div>
              <button
                onClick={() => onCityPrices(product)}
                disabled={loading !== 'idle'}
                aria-label={`City prices for ${product.name}`}
                className="w-full flex items-center justify-center gap-1 px-2 py-1 text-green-400 hover:text-green-300 disabled:opacity-60 text-xs font-medium transition-colors border border-green-400/20 rounded hover:border-green-400/40"
              >
                {loading === 'city' ? (
                  <Spinner size="xs" />
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                )}
                💰 City Prices
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.product._id === nextProps.product._id && 
         prevProps.product.price === nextProps.product.price &&
         prevProps.product.stock === nextProps.product.stock &&
         prevProps.product.name === nextProps.product.name &&
         prevProps.product.discount === nextProps.product.discount &&
         prevProps.loading === nextProps.loading;
});

ProductCard.displayName = "ProductCard";

const Products = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMap, setLoadingMap] = useState<Record<string, ActionState>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const setProductLoading = (id: string, action: ActionState) =>
    setLoadingMap(prev => ({ ...prev, [id]: action }));

  // ─── Fetch products ──────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (signal?: AbortSignal, pageNum = 1) => {
    setIsRefreshing(true);
    try {
      const response = await fetchWithRetry(`/api/admin/products?page=${pageNum}&limit=20`, { signal });
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      const rawData = await response.json();
      const data = ProductsResponseSchema.parse(rawData);
      
      setProducts(data.products as unknown as Product[]);
      setTotalPages(data.pagination?.pages || 1);
      setPage(data.pagination?.page || 1);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to load products');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal, page);
    return () => controller.abort();
  }, [fetchProducts, page]);

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleEdit = (product: Product) => {
    if (!product._id) return;
    setProductLoading(product._id, 'edit');
    router.push(`/admin/edit-product/${product._id}`);
  };

  const handleDelete = (product: Product) => {
    if (!product._id) return;
    setProductLoading(product._id, 'delete');
    router.push(`/admin/delete-product/${product._id}`);
  };

  const handleCityPrices = (product: Product) => {
    if (!product._id) return;
    setProductLoading(product._id, 'city');
    router.push(`/admin/products/${product._id}/city-pricing`);
  };

  // ─── Render Pipeline ─────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl tracking-tight font-bold text-gray-900 mb-1">
          Products
        </h1>
        <div className="h-1 w-24 sm:w-32 md:w-40 bg-gray-900" />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => {
            const controller = new AbortController();
            fetchProducts(controller.signal, page);
          }}
          disabled={isRefreshing}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 font-medium flex items-center gap-2"
        >
          {isRefreshing ? (
            <Spinner />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Refresh
        </button>

        <button
          onClick={() => router.push('/admin/add-product')}
          className="bg-gray-900 text-white px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-800 transition-all duration-300 font-medium flex items-center gap-2 text-sm"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New Product
        </button>
      </div>

      {/* Products List */}
      {products.length > 0 ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((product) => {
              const loading = loadingMap[product._id!] ?? 'idle';
              return (
                <ProductCard
                  key={product._id}
                  product={product}
                  loading={loading}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCityPrices={handleCityPrices}
                />
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 mt-2">
              <button
                disabled={page <= 1 || isRefreshing}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Previous
              </button>
              <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-4 py-2 rounded-lg">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages || isRefreshing}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">
            {isRefreshing ? 'Loading products…' : 'No products found'}
          </p>
          {!isRefreshing && (
            <button
              onClick={() => router.push('/admin/add-product')}
              className="bg-gray-900 text-white px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-800 transition-all duration-300 font-medium text-sm"
            >
              Add Your First Product
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Products;