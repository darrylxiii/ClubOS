import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface CheckboxCellProps {
  value: boolean | null | undefined;
  onChange: (value: boolean) => void;
}

export function CheckboxCell({ value, onChange }: CheckboxCellProps) {
  return (
    <div className="px-3 py-2 flex items-center justify-center">
      <Checkbox
        checked={!!value}
        onCheckedChange={(checked) => onChange(checked as boolean)}
      />
    </div>
  );
}
