import React from 'react';
import { Search, AlertTriangle, AlertCircle, CheckCircle2, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusFilter = 'all' | 'critical' | 'warning' | 'on_target';

interface KPISearchFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  counts: {
    total: number;
    critical: number;
    warning: number;
    onTarget: number;
  };
}

export function KPISearchFilter({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  counts,
}: KPISearchFilterProps) {
  const filterButtons: { key: StatusFilter; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { 
      key: 'all', 
      label: 'All', 
      icon: <LayoutGrid className="h-3.5 w-3.5" />, 
      count: counts.total,
      color: 'bg-muted text-muted-foreground'
    },
    { 
      key: 'critical', 
      label: 'Critical', 
      icon: <AlertCircle className="h-3.5 w-3.5" />, 
      count: counts.critical,
      color: 'bg-destructive/10 text-destructive'
    },
    { 
      key: 'warning', 
      label: 'Warning', 
      icon: <AlertTriangle className="h-3.5 w-3.5" />, 
      count: counts.warning,
      color: 'bg-amber-500/10 text-amber-600'
    },
    { 
      key: 'on_target', 
      label: 'On Target', 
      icon: <CheckCircle2 className="h-3.5 w-3.5" />, 
      count: counts.onTarget,
      color: 'bg-emerald-500/10 text-emerald-600'
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search KPIs..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 bg-background/50"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        {filterButtons.map((btn) => (
          <Button
            key={btn.key}
            variant="ghost"
            size="sm"
            onClick={() => onStatusFilterChange(btn.key)}
            className={cn(
              "h-8 px-3 gap-1.5 text-xs font-medium transition-all",
              statusFilter === btn.key 
                ? "bg-background shadow-sm" 
                : "hover:bg-background/50"
            )}
          >
            {btn.icon}
            <span className="hidden sm:inline">{btn.label}</span>
            <Badge 
              variant="secondary" 
              className={cn(
                "h-5 min-w-[20px] px-1.5 text-[10px] font-semibold",
                statusFilter === btn.key && btn.color
              )}
            >
              {btn.count}
            </Badge>
          </Button>
        ))}
      </div>
    </div>
  );
}
