import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterPillProps {
  icon: ReactNode;
  label: string;
  count?: number;
  isActive?: boolean;
  onClick?: () => void;
  onClear?: () => void;
  className?: string;
}

export const FilterPill = ({
  icon,
  label,
  count = 0,
  isActive = false,
  onClick,
  onClear,
  className,
}: FilterPillProps) => {
  return (
    <Button
      variant={isActive ? "glass" : "outline"}
      size="sm"
      className={cn(
        "gap-2 whitespace-nowrap relative transition-all duration-300 bg-background/30 border-border/30 hover:bg-background/40 hover:border-border/40 shadow-none",
        isActive && "ring-1 ring-border/40 bg-background/40",
        className
      )}
      onClick={onClick}
    >
      {icon}
      <span className="font-semibold">{label}</span>
      {count > 0 && (
        <Badge 
          variant="secondary" 
          className="ml-1 px-1.5 h-5 text-xs border-0 bg-background/60"
        >
          {count}
        </Badge>
      )}
      {isActive && count > 0 && onClear ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="ml-1 p-0.5 rounded-full hover:bg-background/40 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      ) : (
        <ChevronDown className="w-3 h-3 opacity-60" />
      )}
    </Button>
  );
};
