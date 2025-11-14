import { memo, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface EnhancedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultsCount?: number;
}

export const EnhancedSearchBar = memo<EnhancedSearchBarProps>(({
  value,
  onChange,
  placeholder = 'Search courses, skills, topics...',
  resultsCount,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, 300);

  useEffect(() => {
    onChange(debouncedValue);
  }, [debouncedValue, onChange]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-10 h-12 text-base"
      />
      {localValue && resultsCount !== undefined && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {resultsCount} {resultsCount === 1 ? 'result' : 'results'}
        </span>
      )}
    </div>
  );
});

EnhancedSearchBar.displayName = 'EnhancedSearchBar';
