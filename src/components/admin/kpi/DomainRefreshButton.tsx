import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIDomain } from '@/hooks/useUnifiedKPIs';

interface DomainRefreshButtonProps {
  domain: KPIDomain;
  isRefreshing: boolean;
  onRefresh: (domain: KPIDomain) => void;
  size?: 'sm' | 'icon';
  showLabel?: boolean;
}

const domainLabels: Record<KPIDomain, string> = {
  operations: 'Operations',
  website: 'Website',
  sales: 'Sales',
  platform: 'Platform',
  intelligence: 'Intelligence',
  growth: 'Growth',
  costs: 'Costs',
};

export function DomainRefreshButton({
  domain,
  isRefreshing,
  onRefresh,
  size = 'sm',
  showLabel = true,
}: DomainRefreshButtonProps) {
  return (
    <Button
      variant="ghost"
      size={size}
      onClick={() => onRefresh(domain)}
      disabled={isRefreshing}
      className={cn(
        "h-7 px-2 text-xs",
        isRefreshing && "opacity-50"
      )}
      title={`Refresh ${domainLabels[domain]} KPIs`}
    >
      <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin", showLabel && "mr-1")} />
      {showLabel && <span>Refresh</span>}
    </Button>
  );
}
