import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateCellProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  readOnly?: boolean;
}

export function DateCell({ value, onChange, readOnly }: DateCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const date = value ? new Date(value) : undefined;
  const displayValue = date ? format(date, 'MMM d, yyyy') : null;

  const handleSelect = (newDate: Date | undefined) => {
    if (newDate) {
      onChange(newDate.toISOString());
    } else {
      onChange(null);
    }
    setIsOpen(false);
  };

  if (readOnly) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        {displayValue || '-'}
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "px-3 py-2 text-sm cursor-pointer min-h-[36px] hover:bg-muted/50",
            !displayValue && "text-muted-foreground"
          )}
        >
          {displayValue || 'Empty'}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
