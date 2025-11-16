import { memo, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { JobFilterState } from '@/types/jobFilters';

interface AdvancedJobFiltersProps {
  filters: JobFilterState;
  onFilterChange: (updates: Partial<JobFilterState>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  availableCompanies: Array<{ id: string; name: string }>;
}

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
  { value: 'paused', label: 'Paused' },
];

export const AdvancedJobFilters = memo<AdvancedJobFiltersProps>(({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  availableCompanies,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count += filters.status.length;
    if (filters.companies.length > 0) count += filters.companies.length;
    if (filters.dateRange.from || filters.dateRange.to) count += 1;
    return count;
  }, [filters]);

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFilterChange({ status: newStatus });
  };

  const toggleCompany = (companyId: string) => {
    const newCompanies = filters.companies.includes(companyId)
      ? filters.companies.filter(c => c !== companyId)
      : [...filters.companies, companyId];
    onFilterChange({ companies: newCompanies });
  };

  const setDateRange = (from: Date | undefined, to: Date | undefined) => {
    onFilterChange({
      dateRange: {
        from: from || null,
        to: to || null,
      },
    });
  };

  const clearDateRange = () => {
    onFilterChange({
      dateRange: { from: null, to: null },
    });
  };

  return (
    <Card className="border-2 border-border/40 bg-card/50 backdrop-blur-sm">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <CardTitle className="text-base">Advanced Filters</CardTitle>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Status Filter */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Status</h4>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.status.includes(option.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStatus(option.value)}
                    className={cn(
                      'gap-2 transition-all',
                      filters.status.includes(option.value) && 'ring-2 ring-primary/20'
                    )}
                  >
                    <Checkbox
                      checked={filters.status.includes(option.value)}
                      className="pointer-events-none"
                    />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Company Filter */}
            {availableCompanies.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Company</h4>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {availableCompanies.map((company) => (
                    <Button
                      key={company.id}
                      variant={filters.companies.includes(company.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleCompany(company.id)}
                      className={cn(
                        'gap-2 transition-all',
                        filters.companies.includes(company.id) && 'ring-2 ring-primary/20'
                      )}
                    >
                      <Checkbox
                        checked={filters.companies.includes(company.id)}
                        className="pointer-events-none"
                      />
                      {company.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Created Date Range</h4>
                {(filters.dateRange.from || filters.dateRange.to) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDateRange}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal flex-1',
                        !filters.dateRange.from && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (
                        format(filters.dateRange.from, 'PPP')
                      ) : (
                        <span>From date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from || undefined}
                      onSelect={(date) => setDateRange(date, filters.dateRange.to || undefined)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal flex-1',
                        !filters.dateRange.to && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.to ? (
                        format(filters.dateRange.to, 'PPP')
                      ) : (
                        <span>To date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to || undefined}
                      onSelect={(date) => setDateRange(filters.dateRange.from || undefined, date)}
                      initialFocus
                      disabled={(date) => 
                        filters.dateRange.from ? date < filters.dateRange.from : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

AdvancedJobFilters.displayName = 'AdvancedJobFilters';
