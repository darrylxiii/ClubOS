import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Search, Filter, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SearchFilters {
  status?: string[];
  priority?: string[];
  assignee?: string[];
  dateRange?: { start: Date; end: Date } | null;
}

interface TaskSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClear: () => void;
  resultCount?: number;
  loading?: boolean;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function TaskSearchBar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onClear,
  resultCount,
  loading,
}: TaskSearchBarProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const activeFilterCount = 
    (filters.status?.length || 0) + 
    (filters.priority?.length || 0) + 
    (filters.dateRange ? 1 : 0);

  const toggleFilter = (type: "status" | "priority", value: string) => {
    const current = filters[type] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [type]: updated });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks by title, description, or ID..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {(searchQuery || activeFilterCount > 0) && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Popover open={filterOpen} onOpenChange={setFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Status</h4>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={filters.status?.includes(option.value)}
                      onCheckedChange={() => toggleFilter("status", option.value)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Priority</h4>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={filters.priority?.includes(option.value)}
                      onCheckedChange={() => toggleFilter("priority", option.value)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Due Date Range</h4>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange
                      ? `${format(filters.dateRange.start, "MMM d")} - ${format(filters.dateRange.end, "MMM d")}`
                      : "Select date range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={
                      filters.dateRange
                        ? { from: filters.dateRange.start, to: filters.dateRange.end }
                        : undefined
                    }
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        onFiltersChange({
                          ...filters,
                          dateRange: { start: range.from, end: range.to },
                        });
                        setDatePickerOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
              {filters.dateRange && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => onFiltersChange({ ...filters, dateRange: null })}
                >
                  Clear date filter
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {loading && (
        <div className="flex items-center text-sm text-muted-foreground">
          Searching...
        </div>
      )}
      
      {resultCount !== undefined && !loading && searchQuery && (
        <div className="flex items-center text-sm text-muted-foreground">
          {resultCount} result{resultCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
