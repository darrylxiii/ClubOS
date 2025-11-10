import { useState, useEffect, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  badge?: string | number;
  defaultExpanded?: boolean;
  onToggle?: () => void;
  children: ReactNode;
  importance?: 'critical' | 'high' | 'medium' | 'low';
  storageKey?: string;
}

const importanceStyles = {
  critical: 'border-l-4 border-l-primary bg-primary/5',
  high: 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
  medium: 'border-l-2 border-l-muted-foreground',
  low: 'border-l border-l-border',
};

export function CollapsibleSection({
  title,
  icon,
  badge,
  defaultExpanded = false,
  onToggle,
  children,
  importance = 'medium',
  storageKey,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Load state from localStorage if storageKey is provided
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setIsExpanded(saved === 'true');
      }
    }
  }, [storageKey]);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(isExpanded));
    }
  }, [isExpanded, storageKey]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggle?.();
  };

  return (
    <Card className={cn("transition-all duration-200", importanceStyles[importance])}>
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "flex items-center gap-2",
            importance === 'critical' ? 'text-xl' : importance === 'high' ? 'text-lg' : 'text-base'
          )}>
            {icon}
            {title}
            {badge !== undefined && (
              <Badge variant="outline" className="ml-2">
                {badge}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="animate-accordion-down">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
