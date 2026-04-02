/**
 * Type-safe cache key builders.
 * Every cache key string lives here — never inline a raw key string in route/service code.
 */
export const cacheKeys = {
  products: {
    all:      ()                                          => 'products:all'                         as const,
    featured: ()                                          => 'products:featured'                    as const,
    detail:   (id: string)                               => `product:detail:${id}`                 as const,
    admin:    (page: number, limit: number, search: string) => `products:admin:${page}-${limit}-${search}` as const,
  },
  cities: {
    all: () => 'cities:all' as const,
  },
} as const;
