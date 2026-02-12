import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showDisabledOnly: boolean;
  onShowDisabledOnlyChange: (value: boolean) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  showDisabledOnly,
  onShowDisabledOnlyChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-card/50"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedCategory === null ? 'default' : 'outline'}
          className="cursor-pointer hover:bg-accent/20 transition-colors"
          onClick={() => onSelectCategory(null)}
        >
          All
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-accent/20 transition-colors"
            onClick={() => onSelectCategory(selectedCategory === cat ? null : cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Switch
          id="disabled-only"
          checked={showDisabledOnly}
          onCheckedChange={onShowDisabledOnlyChange}
        />
        <Label htmlFor="disabled-only" className="text-sm text-muted-foreground whitespace-nowrap">
          Disabled only
        </Label>
      </div>
    </div>
  );
}
