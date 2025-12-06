import React, { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnifiedKPIs, type KPIDomain, type UnifiedKPI, type DomainHealth } from '@/hooks/useUnifiedKPIs';
import { ExecutiveSummaryBar } from './ExecutiveSummaryBar';
import { DomainSidebar } from './DomainSidebar';
import { KPIOverview } from './KPIOverview';
import { CategoryView } from './CategoryView';
import { KPISearchFilter, type StatusFilter } from './KPISearchFilter';
import { PinnedKPIsSection } from './PinnedKPIsSection';
import { AIExecutiveSummary } from './AIExecutiveSummary';
import { ComparisonToggle } from './ComparisonToggle';
import { KPIDetailModal } from './KPIDetailModal';
import { AlertConfigDialog, type AlertThreshold } from './AlertConfigDialog';
import { CostOverview } from './costs/CostOverview';
import { exportToCSV, exportToPDF } from './KPIExport';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Download, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UnifiedKPICommandCenter() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isComparing, setIsComparing] = useState(false);
  const [pinnedKPIIds, setPinnedKPIIds] = useState<Set<string>>(new Set());
  const [selectedKPI, setSelectedKPI] = useState<UnifiedKPI | null>(null);
  const [alertKPI, setAlertKPI] = useState<UnifiedKPI | null>(null);
  const [alertThresholds, setAlertThresholds] = useState<Record<string, AlertThreshold>>({});
  const isMobile = useIsMobile();

  const {
    isLoading,
    allKPIs,
    byCategory,
    domainHealth,
    overallHealth,
    totalOnTarget,
    totalWarnings,
    totalCritical,
    onTargetPercentage,
    criticalAlerts,
    refreshAll,
    categoryDisplayNames,
  } = useUnifiedKPIs(period);

  // Last updated timestamp
  const lastUpdated = useMemo(() => new Date(), [isLoading]);

  // Filter KPIs based on search and status
  const filteredKPIs = useMemo(() => {
    return allKPIs.filter(kpi => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        kpi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        kpi.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'critical' && kpi.status === 'critical') ||
        (statusFilter === 'warning' && kpi.status === 'warning') ||
        (statusFilter === 'on_target' && kpi.status === 'success');
      
      return matchesSearch && matchesStatus;
    });
  }, [allKPIs, searchTerm, statusFilter]);

  // Counts for filter badges
  const filterCounts = useMemo(() => ({
    total: allKPIs.length,
    critical: allKPIs.filter(k => k.status === 'critical').length,
    warning: allKPIs.filter(k => k.status === 'warning').length,
    onTarget: allKPIs.filter(k => k.status === 'success').length,
  }), [allKPIs]);

  // Pinned KPIs
  const pinnedKPIs = useMemo(() => 
    allKPIs.filter(kpi => pinnedKPIIds.has(kpi.id)),
    [allKPIs, pinnedKPIIds]
  );

  const togglePin = useCallback((kpiId: string) => {
    setPinnedKPIIds(prev => {
      const next = new Set(prev);
      if (next.has(kpiId)) {
        next.delete(kpiId);
        toast.success('KPI unpinned');
      } else {
        next.add(kpiId);
        toast.success('KPI pinned to dashboard');
      }
      return next;
    });
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
      toast.success('All KPIs refreshed');
    } catch (error) {
      toast.error('Failed to refresh KPIs');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveAlert = (threshold: AlertThreshold) => {
    setAlertThresholds(prev => ({ ...prev, [threshold.kpiId]: threshold }));
    toast.success(`Alert configured for ${alertKPI?.displayName}`);
  };

  const handleSelectCategory = (domain: KPIDomain, category: string | null) => {
    if (category) {
      setSelectedCategory(`${domain}:${category}`);
    } else {
      setSelectedCategory(null);
    }
    setSidebarOpen(false);
  };

  const handleSelectOverview = () => {
    setSelectedCategory(null);
    setSidebarOpen(false);
  };

  // Parse selected category
  const [selectedDomain, selectedCat] = selectedCategory?.split(':') || [null, null];
  const selectedKPIs = selectedCategory ? (byCategory[selectedCategory] || []) : [];
  const categoryDisplayName = selectedCat ? (categoryDisplayNames[selectedCat] || selectedCat) : '';

  const sidebarContent = (
    <DomainSidebar
      domainHealth={domainHealth}
      selectedCategory={selectedCategory}
      onSelectCategory={handleSelectCategory}
      onSelectOverview={handleSelectOverview}
    />
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-14 border-b border-border/50 bg-card/50" />
        <div className="flex">
          {!isMobile && <div className="w-64 border-r border-border/50 h-[calc(100vh-3.5rem)]" />}
          <div className="flex-1 p-6 space-y-6">
            {/* 6 domain cards in 2x3 grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Executive Summary Bar */}
      <ExecutiveSummaryBar
        overallHealth={overallHealth}
        criticalCount={totalCritical}
        warningCount={totalWarnings}
        onTargetCount={totalOnTarget}
        onTargetPercentage={onTargetPercentage}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        period={period}
        onPeriodChange={setPeriod}
        lastUpdated={lastUpdated}
      />

      <div className="flex flex-1">
        {/* Mobile Sidebar */}
        {isMobile ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="fixed bottom-4 left-4 z-50 shadow-lg"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        ) : (
          sidebarContent
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {selectedDomain === 'costs' ? (
              <CostOverview />
            ) : selectedCategory ? (
              <CategoryView
                domain={selectedDomain as KPIDomain}
                category={selectedCat!}
                categoryDisplayName={categoryDisplayName}
                kpis={selectedKPIs}
                onBack={handleSelectOverview}
              />
            ) : (
              <>
                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">KPI Command Center</h1>
                      <p className="text-muted-foreground">
                        Unified view across Operations, Website, Sales, Platform, Intelligence, Growth, and Costs
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ComparisonToggle 
                        isComparing={isComparing} 
                        onToggle={() => setIsComparing(!isComparing)}
                        period={period}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { exportToCSV(allKPIs, 'all-kpis'); toast.success('Exported to CSV'); }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { exportToPDF(allKPIs, 'all-kpis'); toast.success('Opening PDF...'); }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Export PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Search and Filter Bar */}
                  <KPISearchFilter
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    counts={filterCounts}
                  />
                </div>

                {/* Pinned KPIs */}
                {pinnedKPIs.length > 0 && (
                  <div className="mb-6">
                    <PinnedKPIsSection
                      pinnedKPIs={pinnedKPIs}
                      onUnpin={(id) => togglePin(id)}
                      onKPIClick={setSelectedKPI}
                    />
                  </div>
                )}

                {/* AI Executive Summary */}
                <div className="mb-6">
                  <AIExecutiveSummary
                    allKPIs={allKPIs}
                    domainHealth={domainHealth.reduce((acc, domain) => {
                      acc[domain.domain] = domain;
                      return acc;
                    }, {} as Record<string, DomainHealth>)}
                    overallHealth={overallHealth}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                  />
                </div>

                <KPIOverview
                  domainHealth={domainHealth}
                  criticalAlerts={criticalAlerts}
                  allKPIs={filteredKPIs}
                  onSelectCategory={handleSelectCategory}
                  searchTerm={searchTerm}
                  statusFilter={statusFilter}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Detail Modal */}
      <KPIDetailModal
        open={!!selectedKPI}
        onOpenChange={(open) => !open && setSelectedKPI(null)}
        kpi={selectedKPI}
        isPinned={selectedKPI ? pinnedKPIIds.has(selectedKPI.id) : false}
        onTogglePin={() => selectedKPI && togglePin(selectedKPI.id)}
        onConfigureAlert={() => {
          setAlertKPI(selectedKPI);
          setSelectedKPI(null);
        }}
      />

      {/* Alert Config Dialog */}
      <AlertConfigDialog
        open={!!alertKPI}
        onOpenChange={(open) => !open && setAlertKPI(null)}
        kpi={alertKPI}
        currentThreshold={alertKPI ? alertThresholds[alertKPI.id] : undefined}
        onSave={handleSaveAlert}
      />
    </div>
  );
}
