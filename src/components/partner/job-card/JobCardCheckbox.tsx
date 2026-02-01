import { memo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface JobCardCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

/**
 * Checkbox component for job card multi-selection
 * Positioned absolutely in top-left of card
 */
export const JobCardCheckbox = memo(({
  checked,
  onCheckedChange,
  className,
}: JobCardCheckboxProps) => {
  return (
    <div
      className={cn(
        'absolute top-4 left-4 z-10',
        'opacity-0 group-hover:opacity-100 transition-opacity',
        checked && 'opacity-100',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          'h-5 w-5 border-2',
          'bg-card/80 backdrop-blur-sm',
          'data-[state=checked]:bg-primary data-[state=checked]:border-primary'
        )}
      />
    </div>
  );
});

JobCardCheckbox.displayName = 'JobCardCheckbox';
