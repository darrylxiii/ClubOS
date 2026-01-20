/**
 * Database Query Optimization Utilities
 * Best practices for efficient database queries
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Batch fetch multiple records efficiently
 */
export const batchFetch = async <T = any>(
  table: string,
  ids: string[],
  batchSize: number = 50
): Promise<T[]> => {
  const results: T[] = [];
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const { data, error } = await (supabase as any)
      .from(table)
      .select('*')
      .in('id', batch);
    
    if (error) throw error;
    if (data) results.push(...(data as T[]));
  }
  
  return results;
};

/**
 * Paginated query with cursor
 */
export const paginatedQuery = async <T = any>(
  table: string,
  pageSize: number = 20,
  cursor?: string,
  orderBy: string = 'created_at'
): Promise<{ data: T[]; nextCursor: string | null }> => {
  let query = (supabase as any)
    .from(table)
    .select('*')
    .order(orderBy, { ascending: false })
    .limit(pageSize + 1);

  if (cursor) {
    query = query.lt(orderBy, cursor);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  const hasMore = data.length > pageSize;
  const items = hasMore ? data.slice(0, -1) : data;
  const nextCursor = hasMore ? (items[items.length - 1] as any)[orderBy] : null;

  return {
    data: items as T[],
    nextCursor,
  };
};

/**
 * Optimized count query (uses head request)
 */
export const getCount = async (
  table: string,
  filters?: Record<string, any>
): Promise<number> => {
  let query = (supabase as any)
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { count, error } = await query;
  
  if (error) throw error;
  return count || 0;
};

/**
 * Cached query with TTL
 */
const queryCache = new Map<string, { data: any; timestamp: number }>();

export const cachedQuery = async <T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttlMs: number = 60000 // 1 minute default
): Promise<T> => {
  const cached = queryCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data as T;
  }

  const data = await queryFn();
  queryCache.set(cacheKey, { data, timestamp: now });

  return data;
};

/**
 * Clear query cache
 */
export const clearQueryCache = (pattern?: string) => {
  if (!pattern) {
    queryCache.clear();
    return;
  }

  const keysToDelete: string[] = [];
  queryCache.forEach((_, key) => {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => queryCache.delete(key));
};

/**
 * Optimized search query with debouncing
 */
let searchTimeout: NodeJS.Timeout;

export const debouncedSearch = async <T = any>(
  table: string,
  searchField: string,
  searchTerm: string,
  delay: number = 300
): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async () => {
      try {
        const { data, error } = await (supabase as any)
          .from(table)
          .select('*')
          .ilike(searchField, `%${searchTerm}%`)
          .limit(50);
        
        if (error) throw error;
        resolve(data as T[]);
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
};
