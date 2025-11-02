import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchOperatorBadgeProps {
  operator: string;
  value: string;
  onRemove: () => void;
  className?: string;
}

const operatorColors = {
  from: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  to: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  is: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  has: "bg-green-500/10 text-green-600 border-green-500/20",
  subject: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

export function SearchOperatorBadge({
  operator,
  value,
  onRemove,
  className,
}: SearchOperatorBadgeProps) {
  const colorClass = operatorColors[operator as keyof typeof operatorColors] || 
    "bg-muted text-muted-foreground border-border/50";

  const displayValue = operator === "has" || operator === "is" 
    ? value 
    : value.length > 20 
      ? `${value.substring(0, 20)}...` 
      : value;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-all animate-in fade-in zoom-in-95 duration-200",
        colorClass,
        className
      )}
    >
      <span className="font-semibold">{operator}:</span>
      <span>{displayValue}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 p-0 hover:bg-transparent opacity-60 hover:opacity-100 ml-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
