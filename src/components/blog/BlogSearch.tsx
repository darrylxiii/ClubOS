import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full pl-12 pr-10 h-12 rounded-full border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-accent"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-muted"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default BlogSearch;
