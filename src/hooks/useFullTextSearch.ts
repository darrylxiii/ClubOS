import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  title: string;
  icon_emoji: string | null;
  content_snippet: string;
  rank: number;
  created_at: string;
  updated_at: string;
}

interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  favoritesOnly?: boolean;
}

export function useFullTextSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, filters?: SearchFilters) => {
    if (!user || query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      // Build the search query
      let dbQuery = supabase
        .from('workspace_pages')
        .select('id, title, icon_emoji, content, created_at, updated_at, is_favorite')
        .or(`user_id.eq.${user.id},visibility.eq.public`);

      // Apply filters
      if (filters?.favoritesOnly) {
        dbQuery = dbQuery.eq('is_favorite', true);
      }
      if (filters?.dateFrom) {
        dbQuery = dbQuery.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        dbQuery = dbQuery.lte('created_at', filters.dateTo);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;

      // Client-side full-text search with ranking
      const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 0);
      
      const scoredResults = (data || [])
        .map(page => {
          const titleLower = (page.title || '').toLowerCase();
          const contentStr = JSON.stringify(page.content || {}).toLowerCase();
          
          let score = 0;
          let matchedTerms = 0;
          
          for (const term of searchTerms) {
            // Title matches are weighted higher
            if (titleLower.includes(term)) {
              score += 10;
              matchedTerms++;
            }
            // Content matches
            if (contentStr.includes(term)) {
              score += 1;
              matchedTerms++;
            }
          }

          // Only include if at least one term matched
          if (matchedTerms === 0) return null;

          // Extract content snippet around first match
          let snippet = '';
          const firstTermIndex = contentStr.indexOf(searchTerms[0]);
          if (firstTermIndex !== -1) {
            const start = Math.max(0, firstTermIndex - 50);
            const end = Math.min(contentStr.length, firstTermIndex + 100);
            snippet = contentStr.slice(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < contentStr.length) snippet = snippet + '...';
          }

          return {
            id: page.id,
            title: page.title || 'Untitled',
            icon_emoji: page.icon_emoji,
            content_snippet: snippet,
            rank: score,
            created_at: page.created_at,
            updated_at: page.updated_at,
          };
        })
        .filter((r): r is SearchResult => r !== null)
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 20);

      setResults(scoredResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    loading,
    search,
    clearResults,
  };
}
