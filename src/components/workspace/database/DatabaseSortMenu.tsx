import React, { useState } from 'react';
import { DatabaseColumn } from '@/hooks/useWorkspaceDatabase';
import { Button } from '@/components/ui/button';
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
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, X, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SortCondition {
  id: string;
  columnId: string;
  direction: 'asc' | 'desc';
}

interface DatabaseSortMenuProps {
  columns: DatabaseColumn[];
  sorts: SortCondition[];
  onSortsChange: (sorts: SortCondition[]) => void;
}

export function DatabaseSortMenu({ columns, sorts, onSortsChange }: DatabaseSortMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const addSort = () => {
    const usedColumnIds = sorts.map(s => s.columnId);
    const availableColumn = columns.find(c => !usedColumnIds.includes(c.id));
    if (!availableColumn) return;

    const newSort: SortCondition = {
      id: crypto.randomUUID(),
      columnId: availableColumn.id,
      direction: 'asc',
    };
    onSortsChange([...sorts, newSort]);
  };

  const updateSort = (sortId: string, updates: Partial<SortCondition>) => {
    onSortsChange(
      sorts.map(s => s.id === sortId ? { ...s, ...updates } : s)
    );
  };

  const removeSort = (sortId: string) => {
    onSortsChange(sorts.filter(s => s.id !== sortId));
  };

  const clearAllSorts = () => {
    onSortsChange([]);
  };

  const moveSort = (sortId: string, direction: 'up' | 'down') => {
    const index = sorts.findIndex(s => s.id === sortId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sorts.length) return;

    const newSorts = [...sorts];
    [newSorts[index], newSorts[newIndex]] = [newSorts[newIndex], newSorts[index]];
    onSortsChange(newSorts);
  };

  const getColumnById = (columnId: string) => columns.find(c => c.id === columnId);
  const usedColumnIds = sorts.map(s => s.columnId);
  const hasAvailableColumns = columns.some(c => !usedColumnIds.includes(c.id));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 gap-1",
            sorts.length > 0 && "text-primary"
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort
          {sorts.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-xs">
              {sorts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[350px] p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sort by</span>
            {sorts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={clearAllSorts}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>

          {sorts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No sorting applied
            </p>
          ) : (
            <div className="space-y-2">
              {sorts.map((sort, index) => {
                const column = getColumnById(sort.columnId);
                
                return (
                  <div key={sort.id} className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        disabled={index === 0}
                        onClick={() => moveSort(sort.id, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        disabled={index === sorts.length - 1}
                        onClick={() => moveSort(sort.id, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <Select
                      value={sort.columnId}
                      onValueChange={(value) => updateSort(sort.id, { columnId: value })}
                    >
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((col) => (
                          <SelectItem 
                            key={col.id} 
                            value={col.id}
                            disabled={usedColumnIds.includes(col.id) && col.id !== sort.columnId}
                          >
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={sort.direction}
                      onValueChange={(value) => updateSort(sort.id, { direction: value as 'asc' | 'desc' })}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">
                          <div className="flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" />
                            Ascending
                          </div>
                        </SelectItem>
                        <SelectItem value="desc">
                          <div className="flex items-center gap-1">
                            <ArrowDown className="h-3 w-3" />
                            Descending
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeSort(sort.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {hasAvailableColumns && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8"
              onClick={addSort}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add sort
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Sort application utility
export function applySorts<T extends { data: Record<string, unknown> }>(
  rows: T[],
  sorts: SortCondition[]
): T[] {
  if (sorts.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const aValue = a.data[sort.columnId];
      const bValue = b.data[sort.columnId];

      let comparison = 0;

      // Handle null/undefined
      if (aValue == null && bValue == null) continue;
      if (aValue == null) comparison = 1;
      else if (bValue == null) comparison = -1;
      // Handle numbers
      else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }
      // Handle booleans
      else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
      }
      // Handle dates
      else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      }
      // Handle strings
      else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
}
