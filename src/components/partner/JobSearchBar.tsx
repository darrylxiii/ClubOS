import { memo, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Button } from '@/components/ui/button';

interface JobSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultsCount?: number;
  placeholder?: string;
}

export const JobSearchBar = memo<JobSearchBarProps>(({
  value,
  onChange,
  resultsCount,
  placeholder = 'Search by job title, company, or location...',
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, 300);

  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  // Sync external changes (e.g., from URL or reset)
  useEffect(() => {
    if (value !== localValue && value !== debouncedValue) {
      setLocalValue(value);
    }
  }, [value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-12 pr-24 h-12 text-base bg-card border-border/40"
      />
      
      {localValue && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {resultsCount !== undefined && (
            <span className="text-sm text-muted-foreground mr-1">
              {resultsCount} {resultsCount === 1 ? 'result' : 'results'}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

JobSearchBar.displayName = 'JobSearchBar';
