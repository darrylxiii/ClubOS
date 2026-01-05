import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TalentTier, TalentPoolFilters as Filters } from '@/hooks/useTalentPool';

interface TalentPoolFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  strategists?: Array<{ id: string; name: string }>;
  className?: string;
}

const tiers: { value: TalentTier; label: string; color: string }[] = [
  { value: 'hot', label: 'Hot', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'warm', label: 'Warm', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'strategic', label: 'Strategic', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'pool', label: 'Pool', color: 'bg-muted text-muted-foreground border-border' },
  { value: 'dormant', label: 'Dormant', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
];

const industries = [
  'Luxury Fashion',
  'Beauty & Cosmetics',
  'Technology',
  'Finance',
  'E-commerce',
  'Retail',
  'Consumer Goods',
];

const seniorityLevels = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP' },
  { value: 'c_level', label: 'C-Level' },
  { value: 'board', label: 'Board' },
];

export function TalentPoolFilters({
  filters,
  onFiltersChange,
  strategists = [],
  className,
}: TalentPoolFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = [
    filters.tiers?.length,
    filters.industries?.length,
    filters.seniorityLevels?.length,
    filters.locations?.length,
    filters.minMoveProbability !== undefined && filters.minMoveProbability > 0 ? 1 : 0,
    filters.ownerId ? 1 : 0,
  ].reduce((acc, count) => acc + (count || 0), 0);

  const toggleTier = (tier: TalentTier) => {
    const currentTiers = filters.tiers || [];
    const newTiers = currentTiers.includes(tier)
      ? currentTiers.filter((t) => t !== tier)
      : [...currentTiers, tier];
    onFiltersChange({ ...filters, tiers: newTiers.length > 0 ? newTiers : undefined });
  };

  const toggleIndustry = (industry: string) => {
    const currentIndustries = filters.industries || [];
    const newIndustries = currentIndustries.includes(industry)
      ? currentIndustries.filter((i) => i !== industry)
      : [...currentIndustries, industry];
    onFiltersChange({ ...filters, industries: newIndustries.length > 0 ? newIndustries : undefined });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Tier chips */}
      <div className="flex flex-wrap gap-1.5">
        {tiers.map((tier) => (
          <Badge
            key={tier.value}
            variant="outline"
            className={cn(
              'cursor-pointer transition-all',
              filters.tiers?.includes(tier.value)
                ? tier.color
                : 'hover:bg-muted'
            )}
            onClick={() => toggleTier(tier.value)}
          >
            {tier.label}
          </Badge>
        ))}
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Industry filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Industry
            {filters.industries?.length ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filters.industries.length}
              </Badge>
            ) : null}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2">
          <div className="space-y-1">
            {industries.map((industry) => (
              <div
                key={industry}
                className={cn(
                  'px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
                  filters.industries?.includes(industry)
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => toggleIndustry(industry)}
              >
                {industry}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Seniority filter */}
      <Select
        value={filters.seniorityLevels?.[0] || ''}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            seniorityLevels: value ? [value] : undefined,
          })
        }
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Seniority" />
        </SelectTrigger>
        <SelectContent>
          {seniorityLevels.map((level) => (
            <SelectItem key={level.value} value={level.value}>
              {level.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Location filter */}
      <Input
        placeholder="Location..."
        className="w-[150px] h-9"
        value={filters.locations?.[0] || ''}
        onChange={(e) =>
          onFiltersChange({
            ...filters,
            locations: e.target.value ? [e.target.value] : undefined,
          })
        }
      />

      {/* Move Probability filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Move %
            {filters.minMoveProbability ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                ≥{filters.minMoveProbability}%
              </Badge>
            ) : null}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Min Move Probability</span>
              <span className="font-medium">{filters.minMoveProbability || 0}%</span>
            </div>
            <Slider
              value={[filters.minMoveProbability || 0]}
              onValueChange={([value]) =>
                onFiltersChange({
                  ...filters,
                  minMoveProbability: value > 0 ? value : undefined,
                })
              }
              max={100}
              step={5}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Owner filter */}
      {strategists.length > 0 && (
        <Select
          value={filters.ownerId || ''}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              ownerId: value || undefined,
            })
          }
        >
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            {strategists.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear all */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
