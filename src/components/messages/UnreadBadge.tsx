import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export function UnreadBadge({ count, className }: UnreadBadgeProps) {
  if (count === 0) return null;

  return (
    <Badge 
      variant="destructive" 
      className={cn(
        "absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1.5 text-xs font-bold rounded-full shadow-glow animate-pulse",
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
}
