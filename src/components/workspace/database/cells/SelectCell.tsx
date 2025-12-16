import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  color: string;
}

interface SelectCellProps {
  value: string | string[] | null | undefined;
  onChange: (value: string | string[] | null) => void;
  options: Record<string, unknown>;
  isMulti: boolean;
}

const colorClasses: Record<string, string> = {
  gray: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  red: 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
  orange: 'bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  yellow: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  green: 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200',
  blue: 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  purple: 'bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  pink: 'bg-pink-200 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

export function SelectCell({ value, onChange, options, isMulti }: SelectCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newOption, setNewOption] = useState('');

  const selectOptions = (options?.options as SelectOption[]) || [];
  const selectedValues = isMulti
    ? (Array.isArray(value) ? value : [])
    : (value ? [value as string] : []);

  const handleSelect = (optionValue: string) => {
    if (isMulti) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValues.length > 0 ? newValues : null);
    } else {
      onChange(selectedValues.includes(optionValue) ? null : optionValue);
      setIsOpen(false);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMulti) {
      const newValues = selectedValues.filter(v => v !== optionValue);
      onChange(newValues.length > 0 ? newValues : null);
    } else {
      onChange(null);
    }
  };

  const getOptionByValue = (val: string) => selectOptions.find(o => o.value === val);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="px-2 py-1.5 min-h-[36px] cursor-pointer hover:bg-muted/50 flex flex-wrap gap-1 items-center">
          {selectedValues.length > 0 ? (
            selectedValues.map(val => {
              const opt = getOptionByValue(val);
              return (
                <span
                  key={val}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    colorClasses[opt?.color || 'gray']
                  )}
                >
                  {val}
                  <button
                    onClick={(e) => handleRemove(val, e)}
                    className="hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          ) : (
            <span className="text-sm text-muted-foreground">Empty</span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          {selectOptions.map((option) => (
            <button
              key={option.value}
              className={cn(
                "w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-muted",
              )}
              onClick={() => handleSelect(option.value)}
            >
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  colorClasses[option.color || 'gray']
                )}
              >
                {option.value}
              </span>
              {selectedValues.includes(option.value) && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}

          {selectOptions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No options yet
            </p>
          )}

          <div className="pt-2 border-t border-border">
            <div className="flex gap-1">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Add option..."
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                disabled={!newOption.trim()}
                onClick={() => {
                  // Note: In a full implementation, this would add to column options
                  handleSelect(newOption.trim());
                  setNewOption('');
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
