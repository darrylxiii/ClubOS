import React, { useState, useEffect, useMemo } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Search, Pin, Bell, Download, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { UnifiedKPI } from '@/hooks/useUnifiedKPIs';

interface KPICommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpis: UnifiedKPI[];
  pinnedKPIIds: Set<string>;
  onSelectKPI: (kpi: UnifiedKPI) => void;
  onTogglePin: (kpiId: string) => void;
  onConfigureAlert: (kpi: UnifiedKPI) => void;
  onExport: () => void;
  onRefresh: () => void;
}

const statusIcons = {
  success: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  warning: <AlertTriangle className="h-3 w-3 text-amber-500" />,
  critical: <AlertTriangle className="h-3 w-3 text-red-500" />,
  neutral: <Clock className="h-3 w-3 text-muted-foreground" />,
};

export function KPICommandPalette({
  open,
  onOpenChange,
  kpis,
  pinnedKPIIds,
  onSelectKPI,
  onTogglePin,
  onConfigureAlert,
  onExport,
  onRefresh,
}: KPICommandPaletteProps) {
  const [search, setSearch] = useState('');

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  // Filtered and grouped KPIs
  const { pinnedKPIs, criticalKPIs, recentKPIs } = useMemo(() => {
    const pinned = kpis.filter(k => pinnedKPIIds.has(k.id));
    const critical = kpis.filter(k => k.status === 'critical' && !pinnedKPIIds.has(k.id));
    const recent = kpis.slice(0, 5).filter(k => !pinnedKPIIds.has(k.id) && k.status !== 'critical');
    return { pinnedKPIs: pinned, criticalKPIs: critical, recentKPIs: recent };
  }, [kpis, pinnedKPIIds]);

  const formatValue = (kpi: UnifiedKPI) => {
    const value = kpi.value;
    switch (kpi.format) {
      case 'percent': return `${value.toFixed(1)}%`;
      case 'currency': return `€${value.toLocaleString()}`;
      case 'hours': return `${value.toFixed(1)}h`;
      default: return value.toLocaleString();
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search KPIs, run commands..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No KPIs found.</CommandEmpty>
        
        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Refresh All KPIs</span>
            <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">⌘R</kbd>
          </CommandItem>
          <CommandItem onSelect={onExport}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export KPI Report</span>
            <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">⌘E</kbd>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />

        {/* Pinned KPIs */}
        {pinnedKPIs.length > 0 && (
          <CommandGroup heading="Pinned KPIs">
            {pinnedKPIs.map(kpi => (
              <CommandItem 
                key={kpi.id} 
                onSelect={() => onSelectKPI(kpi)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Pin className="h-3 w-3 text-primary" />
                  {statusIcons[kpi.status]}
                  <span>{kpi.displayName}</span>
                </div>
                <Badge variant="outline" className="ml-2">
                  {formatValue(kpi)}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Critical Alerts */}
        {criticalKPIs.length > 0 && (
          <CommandGroup heading="Critical Alerts">
            {criticalKPIs.slice(0, 5).map(kpi => (
              <CommandItem 
                key={kpi.id} 
                onSelect={() => onSelectKPI(kpi)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span>{kpi.displayName}</span>
                  <Badge variant="outline" className="text-xs">{kpi.domain}</Badge>
                </div>
                <Badge variant="destructive" className="ml-2">
                  {formatValue(kpi)}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* All KPIs (searchable) */}
        <CommandGroup heading="All KPIs">
          {kpis.slice(0, 20).map(kpi => (
            <CommandItem 
              key={kpi.id} 
              onSelect={() => onSelectKPI(kpi)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {statusIcons[kpi.status]}
                <span>{kpi.displayName}</span>
                <Badge variant="outline" className="text-xs">{kpi.domain}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{formatValue(kpi)}</Badge>
                {kpi.trendDirection && (
                  <TrendingUp className={`h-3 w-3 ${
                    kpi.trendDirection === 'up' 
                      ? kpi.lowerIsBetter ? 'text-red-500' : 'text-green-500'
                      : kpi.trendDirection === 'down'
                        ? kpi.lowerIsBetter ? 'text-green-500' : 'text-red-500'
                        : 'text-muted-foreground'
                  } ${kpi.trendDirection === 'down' ? 'rotate-180' : ''}`} />
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// Hook for keyboard shortcut
export function useKPICommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd+Shift+K for KPI palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return { open, setOpen };
}
