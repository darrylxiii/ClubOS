import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BrandAssets {
  logo_url: string | null;
  icon_url: string | null;
  brand_name: string | null;
  primary_color: string | null;
  colors: Array<{ hex: string; type: string; brightness: number }>;
  cached?: boolean;
}

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(cleanUrl);
    return urlObj.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    // If URL parsing fails, try basic extraction
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .toLowerCase()
      .trim() || null;
  }
}

export function useBrandAssets(websiteUrl: string | null | undefined, options?: { enabled?: boolean }) {
  const domain = extractDomain(websiteUrl);
  
  return useQuery({
    queryKey: ['brand-assets', domain],
    queryFn: async (): Promise<BrandAssets | null> => {
      if (!domain) return null;

      const { data, error } = await supabase.functions.invoke('fetch-brand-assets', {
        body: { domain }
      });

      if (error) {
        console.error('Error fetching brand assets:', error);
        return null;
      }

      if (data?.error) {
        console.log(`Brand not found for ${domain}:`, data.error);
        return null;
      }

      return data as BrandAssets;
    },
    enabled: !!domain && (options?.enabled !== false),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: false, // Don't retry failed brand fetches
  });
}

export function useBrandAssetsFromDomain(domain: string | null | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['brand-assets', domain],
    queryFn: async (): Promise<BrandAssets | null> => {
      if (!domain) return null;

      const { data, error } = await supabase.functions.invoke('fetch-brand-assets', {
        body: { domain }
      });

      if (error) {
        console.error('Error fetching brand assets:', error);
        return null;
      }

      if (data?.error) {
        return null;
      }

      return data as BrandAssets;
    },
    enabled: !!domain && (options?.enabled !== false),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
    retry: false,
  });
}
