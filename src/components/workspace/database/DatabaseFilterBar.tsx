import React, { useState } from 'react';
import { DatabaseColumn, ColumnType } from '@/hooks/useWorkspaceDatabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Filter, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterCondition {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string;
}

export type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal';

const operatorsByType: Record<ColumnType, FilterOperator[]> = {
  text: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_empty', 'is_not_empty'],
  date: ['equals', 'not_equals', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'],
  checkbox: ['equals'],
  select: ['equals', 'not_equals', 'is_empty', 'is_not_empty'],
  multi_select: ['contains', 'not_contains', 'is_empty', 'is_not_empty'],
  person: ['equals', 'not_equals', 'is_empty', 'is_not_empty'],
  url: ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'],
  email: ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'],
  phone: ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'],
  relation: ['is_empty', 'is_not_empty'],
  formula: ['equals', 'not_equals', 'contains'],
  created_time: ['equals', 'not_equals', 'greater_than', 'less_than'],
  updated_time: ['equals', 'not_equals', 'greater_than', 'less_than'],
};

const operatorLabels: Record<FilterOperator, string> = {
  equals: 'is',
  not_equals: 'is not',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  greater_than: '>',
  less_than: '<',
  greater_or_equal: '≥',
  less_or_equal: '≤',
};

interface DatabaseFilterBarProps {
  columns: DatabaseColumn[];
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
}

export function DatabaseFilterBar({ columns, filters, onFiltersChange }: DatabaseFilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const addFilter = () => {
    const firstColumn = columns[0];
    if (!firstColumn) return;
    
    const newFilter: FilterCondition = {
      id: crypto.randomUUID(),
      columnId: firstColumn.id,
      operator: 'contains',
      value: '',
    };
    onFiltersChange([...filters, newFilter]);
  };

  const updateFilter = (filterId: string, updates: Partial<FilterCondition>) => {
    onFiltersChange(
      filters.map(f => f.id === filterId ? { ...f, ...updates } : f)
    );
  };

  const removeFilter = (filterId: string) => {
    onFiltersChange(filters.filter(f => f.id !== filterId));
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  const getColumnById = (columnId: string) => columns.find(c => c.id === columnId);

  const needsValueInput = (operator: FilterOperator) => {
    return !['is_empty', 'is_not_empty'].includes(operator);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1",
              filters.length > 0 && "text-primary"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            {filters.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-xs">
                {filters.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[400px] p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filters</span>
              {filters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={clearAllFilters}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>

            {filters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No filters applied
              </p>
            ) : (
              <div className="space-y-2">
                {filters.map((filter, index) => {
                  const column = getColumnById(filter.columnId);
                  const availableOperators = column 
                    ? operatorsByType[column.column_type] || operatorsByType.text
                    : operatorsByType.text;

                  return (
                    <div key={filter.id} className="flex items-center gap-2">
                      {index > 0 && (
                        <span className="text-xs text-muted-foreground w-8">and</span>
                      )}
                      <Select
                        value={filter.columnId}
                        onValueChange={(value) => updateFilter(filter.id, { columnId: value })}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue placeholder="Column" />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator}
                        onValueChange={(value) => updateFilter(filter.id, { operator: value as FilterOperator })}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableOperators.map((op) => (
                            <SelectItem key={op} value={op}>
                              {operatorLabels[op]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {needsValueInput(filter.operator) && (
                        <Input
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          placeholder="Value..."
                          className="h-8 text-xs flex-1"
                        />
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeFilter(filter.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full h-8"
              onClick={addFilter}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {filters.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.slice(0, 3).map((filter) => {
            const column = getColumnById(filter.columnId);
            return (
              <div
                key={filter.id}
                className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-xs"
              >
                <span className="font-medium">{column?.name}</span>
                <span className="text-muted-foreground">{operatorLabels[filter.operator]}</span>
                {filter.value && <span>"{filter.value}"</span>}
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {filters.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{filters.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Filter application utility
export function applyFilters<T extends { id: string; data: Record<string, unknown> }>(
  rows: T[],
  filters: FilterCondition[]
): T[] {
  if (filters.length === 0) return rows;

  return rows.filter(row => {
    return filters.every(filter => {
      const value = row.data[filter.columnId];
      const filterValue = filter.value.toLowerCase();

      switch (filter.operator) {
        case 'equals':
          return String(value || '').toLowerCase() === filterValue;
        case 'not_equals':
          return String(value || '').toLowerCase() !== filterValue;
        case 'contains':
          return String(value || '').toLowerCase().includes(filterValue);
        case 'not_contains':
          return !String(value || '').toLowerCase().includes(filterValue);
        case 'starts_with':
          return String(value || '').toLowerCase().startsWith(filterValue);
        case 'ends_with':
          return String(value || '').toLowerCase().endsWith(filterValue);
        case 'is_empty':
          return value === null || value === undefined || value === '';
        case 'is_not_empty':
          return value !== null && value !== undefined && value !== '';
        case 'greater_than':
          return Number(value) > Number(filter.value);
        case 'less_than':
          return Number(value) < Number(filter.value);
        case 'greater_or_equal':
          return Number(value) >= Number(filter.value);
        case 'less_or_equal':
          return Number(value) <= Number(filter.value);
        default:
          return true;
      }
    });
  });
}
