import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ChevronRight, 
  Home,
  BarChart3,
  Users,
  Building2,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  level: 'overview' | 'domain' | 'category' | 'kpi' | 'detail';
  data?: {
    domain?: string;
    category?: string;
    kpiId?: string;
  };
}

interface DrillDownNavigationProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (level: number) => void;
  className?: string;
}

const levelIcons = {
  overview: Home,
  domain: BarChart3,
  category: Building2,
  kpi: Users,
  detail: Calendar,
};

export function DrillDownNavigation({ 
  breadcrumbs, 
  onNavigate,
  className 
}: DrillDownNavigationProps) {
  if (breadcrumbs.length <= 1) return null;

  return (
    <nav 
      className={cn(
        "flex items-center gap-1 text-sm overflow-x-auto pb-1",
        className
      )}
      aria-label="Drill-down navigation"
    >
      {breadcrumbs.map((item, index) => {
        const Icon = levelIcons[item.level];
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <React.Fragment key={`${item.level}-${index}`}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 gap-1.5 flex-shrink-0",
                isLast 
                  ? "text-foreground font-medium pointer-events-none" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => !isLast && onNavigate(index)}
              disabled={isLast}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate max-w-[120px]">{item.label}</span>
            </Button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// Hook for managing drill-down state
export function useDrillDown() {
  const [stack, setStack] = React.useState<BreadcrumbItem[]>([
    { label: 'Overview', level: 'overview' }
  ]);

  const push = React.useCallback((item: BreadcrumbItem) => {
    setStack(prev => [...prev, item]);
  }, []);

  const navigateTo = React.useCallback((level: number) => {
    setStack(prev => prev.slice(0, level + 1));
  }, []);

  const reset = React.useCallback(() => {
    setStack([{ label: 'Overview', level: 'overview' }]);
  }, []);

  const current = stack[stack.length - 1];

  return {
    breadcrumbs: stack,
    current,
    push,
    navigateTo,
    reset,
    depth: stack.length,
  };
}
