import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Clock, Activity, TrendingUp, X } from "lucide-react";

export type JobFilterType = 'all' | 'expiring-soon' | 'recent-activity' | 'high-engagement';

interface JobFilterBarProps {
  currentFilter: JobFilterType;
  onFilterChange: (filter: JobFilterType) => void;
  jobCounts: {
    all: number;
    expiringSoon: number;
    recentActivity: number;
    highEngagement: number;
  };
}

export const JobFilterBar = memo(({ 
  currentFilter, 
  onFilterChange,
  jobCounts 
}: JobFilterBarProps) => {
  const filters = [
    { id: 'all' as JobFilterType, label: 'All Jobs', icon: Filter, count: jobCounts.all },
    { id: 'expiring-soon' as JobFilterType, label: 'Expiring Soon', icon: Clock, count: jobCounts.expiringSoon },
    { id: 'recent-activity' as JobFilterType, label: 'Recent Activity', icon: Activity, count: jobCounts.recentActivity },
    { id: 'high-engagement' as JobFilterType, label: 'High Engagement', icon: TrendingUp, count: jobCounts.highEngagement },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = currentFilter === filter.id;
        
        return (
          <Button
            key={filter.id}
            variant={isActive ? "glass" : "outline"}
            size="sm"
            className={`gap-2 whitespace-nowrap ${isActive ? 'ring-2 ring-border/40' : ''}`}
            onClick={() => onFilterChange(filter.id)}
          >
            <Icon className="w-4 h-4" />
            <span>{filter.label}</span>
            {filter.count > 0 && (
              <Badge 
                variant="outline" 
                className="ml-1 px-1.5 h-5 text-xs border-border/20 bg-card/40"
              >
                {filter.count}
              </Badge>
            )}
          </Button>
        );
      })}
      
      {currentFilter !== 'all' && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => onFilterChange('all')}
        >
          <X className="w-4 h-4" />
          Clear
        </Button>
      )}
    </div>
  );
});

JobFilterBar.displayName = 'JobFilterBar';
