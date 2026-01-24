import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimeFormat } from '@/hooks/useTimeFormatPreference';

interface TimeFormatToggleProps {
  format: TimeFormat;
  onToggle: () => void;
  className?: string;
}

export function TimeFormatToggle({ format, onToggle, className }: TimeFormatToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
        "border border-border/50 bg-muted/30 hover:bg-muted/50",
        "transition-colors duration-200",
        "text-muted-foreground hover:text-foreground",
        className
      )}
      title={`Switch to ${format === '12h' ? '24-hour' : '12-hour'} format`}
      aria-label={`Currently using ${format === '12h' ? '12-hour' : '24-hour'} format. Click to switch.`}
    >
      <Clock className="h-3 w-3" />
      <span className="font-medium tabular-nums">
        {format === '12h' ? '9:00 AM' : '09:00'}
      </span>
      <span className="text-muted-foreground/60 mx-0.5">|</span>
      <span className="text-muted-foreground/60 tabular-nums">
        {format === '12h' ? '09:00' : '9:00 AM'}
      </span>
    </button>
  );
}
