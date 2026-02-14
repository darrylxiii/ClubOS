import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface ExpenseCategory {
  id: string;
  name: string;
}

interface ExpenseFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  recurringFilter: string;
  onRecurringFilterChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  categories: ExpenseCategory[];
  onClear: () => void;
  hasActiveFilters: boolean;
}

export default function ExpenseFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  recurringFilter,
  onRecurringFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  categories,
  onClear,
  hasActiveFilters,
}: ExpenseFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vendor or description..."
          className="pl-8"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={recurringFilter} onValueChange={onRecurringFilterChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="recurring">Recurring</SelectItem>
          <SelectItem value="one-time">One-Time</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="w-[140px]"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        placeholder="From"
      />
      <Input
        type="date"
        className="w-[140px]"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        placeholder="To"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9">
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
