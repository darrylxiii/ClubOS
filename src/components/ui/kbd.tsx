import { memo } from 'react';
import { cn } from '@/lib/utils';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Keyboard key indicator component
 * Used for displaying keyboard shortcuts
 */
export const Kbd = memo(({ children, className }: KbdProps) => {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center px-2 py-1',
        'min-w-[1.75rem] h-6',
        'text-xs font-mono font-semibold',
        'bg-muted/50 border border-border/40 rounded-md',
        'shadow-sm',
        className
      )}
    >
      {children}
    </kbd>
  );
});

Kbd.displayName = 'Kbd';
