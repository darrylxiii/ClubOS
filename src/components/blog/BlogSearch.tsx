import React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BlogSearchProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  resultsCount?: number;
}

const BlogSearch: React.FC<BlogSearchProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder = "Search articles...",
  className,
  resultsCount,
}) => {
  const isSearching = value.trim().length > 0;

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full pl-7 pr-8 py-2.5 bg-transparent border-0 border-b border-border text-foreground placeholder:text-muted-foreground/50 text-body-sm focus:outline-none focus:border-foreground transition-colors duration-200"
        role="combobox"
        aria-expanded={isSearching}
        aria-haspopup="listbox"
        aria-controls="blog-search-results"
        aria-autocomplete="list"
        aria-label="Search blog articles"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md hover:bg-muted"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

export default BlogSearch;
