import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFullTextSearch } from '@/hooks/useFullTextSearch';
import { Search, FileText, Star, Calendar, Filter, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AdvancedSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdvancedSearchDialog({ open, onOpenChange }: AdvancedSearchDialogProps) {
  const navigate = useNavigate();
  const { results, loading, search, clearResults } = useFullTextSearch();
  
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    favoritesOnly: false,
    dateFrom: '',
    dateTo: '',
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        search(query, filters);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters, search, clearResults]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setShowFilters(false);
      setFilters({ favoritesOnly: false, dateFrom: '', dateTo: '' });
      clearResults();
    }
  }, [open, clearResults]);

  const handleSelect = useCallback((pageId: string) => {
    navigate(`/pages/${pageId}`);
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  const clearFilters = () => {
    setFilters({ favoritesOnly: false, dateFrom: '', dateTo: '' });
  };

  const hasActiveFilters = filters.favoritesOnly || filters.dateFrom || filters.dateTo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages by title or content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-20"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(hasActiveFilters && 'text-primary')}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filters</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">From Date</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">To Date</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="favorites"
                  checked={filters.favoritesOnly}
                  onCheckedChange={(checked) => 
                    setFilters(f => ({ ...f, favoritesOnly: checked as boolean }))
                  }
                />
                <Label htmlFor="favorites" className="text-sm cursor-pointer">
                  Favorites only
                </Label>
              </div>
            </div>
          )}

          {/* Results */}
          <ScrollArea className="h-[400px]">
            {query.length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Search className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">Type at least 2 characters to search</p>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No pages found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result.id)}
                    className="w-full p-3 text-left rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">
                        {result.icon_emoji || '📄'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{result.title}</span>
                          {result.rank > 5 && (
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        {result.content_snippet && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {result.content_snippet}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(result.updated_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
