import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SemanticSearchResult {
  id: string;
  full_name: string;
  email: string;
  current_title: string;
  current_company: string;
  location: string;
  talent_tier: string;
  move_probability: number;
  similarity_score: number;
  match_explanation?: string;
}

interface SemanticSearchBarProps {
  onSearch: (query: string) => void;
  onResults?: (results: SemanticSearchResult[]) => void;
  isSearching?: boolean;
  resultCount?: number;
  lastQuery?: string;
  onClear?: () => void;
  className?: string;
  filters?: {
    talent_tiers?: string[];
    min_move_probability?: number;
    locations?: string[];
    industries?: string[];
  };
}

const suggestedSearches = [
  'CMO with luxury fashion background',
  'VP Engineering, fintech experience',
  'Senior marketing director, beauty industry',
  'CFO with PE/VC experience',
  'Creative director, 10+ years luxury brands',
  'Head of Digital, e-commerce focus',
];

export function SemanticSearchBar({
  onSearch,
  onResults,
  isSearching: externalIsSearching = false,
  resultCount,
  lastQuery,
  onClear,
  className,
  filters,
}: SemanticSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SemanticSearchResult[]>([]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    onSearch(query.trim());

    try {
      const { data, error } = await supabase.functions.invoke('enhance-semantic-candidate-search', {
        body: {
          query: query.trim(),
          filters: filters || {},
          limit: 25,
          include_explanation: true,
          similarity_threshold: 0.3
        }
      });

      if (error) throw error;

      if (data?.success && data.results) {
        setSearchResults(data.results);
        onResults?.(data.results);
        toast.success(`Found ${data.results.length} matching candidates`);
      } else {
        toast.info('No candidates found matching your search');
        setSearchResults([]);
        onResults?.([]);
      }
    } catch (error) {
      console.error('Semantic search error:', error);
      toast.error('Search failed. Falling back to basic search.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, onSearch, onResults, filters]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      onSearch(suggestion);
      // Trigger search after setting query
      setTimeout(() => handleSearch(), 0);
    },
    [onSearch, handleSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    onClear?.();
  }, [onClear]);

  const searching = isSearching || externalIsSearching;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your ideal candidate in natural language..."
          className="pl-12 pr-32 h-14 text-base bg-card/50 border-border/40 focus:border-primary/50"
          disabled={searching}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-8 w-8"
              disabled={searching}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || searching}
            className="gap-2"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                AI Search
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results indicator */}
      {(resultCount !== undefined || searchResults.length > 0) && lastQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="font-normal">
            {searchResults.length || resultCount} results
          </Badge>
          <span>for "{lastQuery}"</span>
          <Button variant="link" size="sm" onClick={handleClear} className="text-xs h-auto p-0">
            Clear
          </Button>
        </div>
      )}

      {/* Suggested searches */}
      {!lastQuery && searchResults.length === 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground mr-1">Try:</span>
          {suggestedSearches.slice(0, 4).map((suggestion) => (
            <Badge
              key={suggestion}
              variant="outline"
              className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
