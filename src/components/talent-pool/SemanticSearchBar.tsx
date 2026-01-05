import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SemanticSearchBarProps {
  onSearch: (query: string) => void;
  isSearching?: boolean;
  resultCount?: number;
  lastQuery?: string;
  onClear?: () => void;
  className?: string;
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
  isSearching = false,
  resultCount,
  lastQuery,
  onClear,
  className,
}: SemanticSearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  }, [query, onSearch]);

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
    },
    [onSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onClear?.();
  }, [onClear]);

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
          disabled={isSearching}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-8 w-8"
              disabled={isSearching}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="gap-2"
          >
            {isSearching ? (
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
      {resultCount !== undefined && lastQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="font-normal">
            {resultCount} results
          </Badge>
          <span>for "{lastQuery}"</span>
          <Button variant="link" size="sm" onClick={handleClear} className="text-xs h-auto p-0">
            Clear
          </Button>
        </div>
      )}

      {/* Suggested searches */}
      {!lastQuery && (
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
