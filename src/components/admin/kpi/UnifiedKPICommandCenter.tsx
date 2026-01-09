import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnifiedKPIs, type KPIDomain, type UnifiedKPI, type DomainHealth } from '@/hooks/useUnifiedKPIs';
import { useKPIRefresh } from '@/hooks/useKPIRefresh';
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
import { FinancialKPISection } from './FinancialKPISection';
import { exportToCSV, exportToPDF } from './KPIExport';
import { usePinnedKPIs } from '@/hooks/usePinnedKPIs';
import { useKPIAuditLog } from '@/hooks/useKPIAuditLog';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Menu, Download, FileText, RefreshCw, Zap, Crown, BarChart3, ClipboardList, Command, Users, Target, GitBranch } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Lazy load heavy components
import { KPICommandPalette } from './KPICommandPalette';
import { ExecutiveKPIDashboard } from './ExecutiveKPIDashboard';
import { BoardReportGenerator } from './BoardReportGenerator';
import { KPIReportBuilder } from './KPIReportBuilder';
import { KPIAuditLogViewer } from './KPIAuditLogViewer';
import { DepartmentHeadView } from './DepartmentHeadView';
import { KPIRadarChart } from './KPIRadarChart';
import { KPIHeatMap } from './KPIHeatMap';
import { OKRIntegration } from './OKRIntegration';
import { DataLineageViewer } from './DataLineageViewer';

type ViewMode = 'overview' | 'executive' | 'audit' | 'department' | 'okr' | 'lineage';

export function UnifiedKPICommandCenter() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isComparing, setIsComparing] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<UnifiedKPI | null>(null);
  const [alertKPI, setAlertKPI] = useState<UnifiedKPI | null>(null);
  const [alertThresholds, setAlertThresholds] = useState<Record<string, AlertThreshold>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [boardReportOpen, setBoardReportOpen] = useState(false);
  const [reportBuilderOpen, setReportBuilderOpen] = useState(false);
  const isMobile = useIsMobile();

  // Audit logging
  const { logAction } = useKPIAuditLog();

  // Use persistent pinned KPIs hook
  const { pinnedKPIIds, isPinned, togglePin: persistentTogglePin, isLoading: isPinsLoading } = usePinnedKPIs();

  // KPI Refresh hook for backend recalculation
  const { 
    isRefreshing: isRecalculating, 
    refreshAll: recalculateAll, 
    refreshSingleDomain,
    lastRefresh,
    lastResult 
  } = useKPIRefresh();

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

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Combined refreshing state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Last updated timestamp
  const lastUpdated = useMemo(() => lastRefresh || new Date(), [lastRefresh, isLoading]);

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

  // Pinned KPIs - convert array to set for lookup
  const pinnedSet = useMemo(() => new Set(pinnedKPIIds), [pinnedKPIIds]);
  const pinnedKPIs = useMemo(() => 
    allKPIs.filter(kpi => pinnedSet.has(kpi.id)),
    [allKPIs, pinnedSet]
  );

  const togglePin = useCallback((kpiId: string, domain?: string) => {
    // Find the KPI's domain if not provided
    const kpi = allKPIs.find(k => k.id === kpiId);
    const kpiDomain = domain || kpi?.domain || 'operations';
    
    persistentTogglePin(kpiId, kpiDomain);
    
    if (isPinned(kpiId)) {
      toast.success('KPI unpinned');
    } else {
      toast.success('KPI pinned to dashboard');
    }
  }, [allKPIs, persistentTogglePin, isPinned]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // First recalculate via edge functions, then refresh UI data
      await recalculateAll();
      await refreshAll();
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
            ) : selectedCategory && selectedDomain && selectedCat ? (
              <CategoryView
                domain={selectedDomain as KPIDomain}
                category={selectedCat}
                categoryDisplayName={categoryDisplayName || selectedCat}
                kpis={selectedKPIs || []}
                onBack={handleSelectOverview}
              />
            ) : (
              <>
                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">KPI Command Center</h1>
                      <p className="text-muted-foreground">
                        Unified view across Operations, Website, Sales, Platform, Intelligence, Growth, and Costs
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* View Mode Tabs */}
                      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                        <TabsList className="h-9">
                          <TabsTrigger value="overview" className="gap-1.5 text-xs px-3">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Overview
                          </TabsTrigger>
                          <TabsTrigger value="executive" className="gap-1.5 text-xs px-3">
                            <Crown className="h-3.5 w-3.5" />
                            Executive
                          </TabsTrigger>
                          <TabsTrigger value="department" className="gap-1.5 text-xs px-3">
                            <Users className="h-3.5 w-3.5" />
                            Team
                          </TabsTrigger>
                          <TabsTrigger value="okr" className="gap-1.5 text-xs px-3">
                            <Target className="h-3.5 w-3.5" />
                            OKRs
                          </TabsTrigger>
                          <TabsTrigger value="lineage" className="gap-1.5 text-xs px-3">
                            <GitBranch className="h-3.5 w-3.5" />
                            Lineage
                          </TabsTrigger>
                          <TabsTrigger value="audit" className="gap-1.5 text-xs px-3">
                            <ClipboardList className="h-3.5 w-3.5" />
                            Audit
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      {/* Command Palette Trigger */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCommandPaletteOpen(true)}
                        className="hidden md:flex"
                      >
                        <Command className="h-4 w-4 mr-2" />
                        <span className="text-muted-foreground text-xs">⌘⇧K</span>
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                        {isRefreshing ? 'Calculating...' : 'Recalculate'}
                      </Button>
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
                          <DropdownMenuItem onClick={() => { 
                            exportToCSV(allKPIs, 'all-kpis'); 
                            logAction('export', undefined, undefined, { format: 'csv' });
                            toast.success('Exported to CSV'); 
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { 
                            exportToPDF(allKPIs, 'all-kpis'); 
                            logAction('export', undefined, undefined, { format: 'pdf' });
                            toast.success('Opening PDF...'); 
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Export PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setBoardReportOpen(true)}>
                            <Crown className="h-4 w-4 mr-2" />
                            Board Report (AI)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setReportBuilderOpen(true)}>
                            <Zap className="h-4 w-4 mr-2" />
                            Schedule Reports
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Search and Filter Bar - Only in Overview mode */}
                  {viewMode === 'overview' && (
                    <KPISearchFilter
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      statusFilter={statusFilter}
                      onStatusFilterChange={setStatusFilter}
                      counts={filterCounts}
                    />
                  )}
                </div>

                {/* View Mode Content */}
                {viewMode === 'executive' ? (
                  <ExecutiveKPIDashboard
                    allKPIs={allKPIs}
                    domainHealth={domainHealth}
                    overallHealth={overallHealth}
                    onGenerateReport={() => setBoardReportOpen(true)}
                  />
                ) : viewMode === 'audit' ? (
                  <KPIAuditLogViewer />
                ) : viewMode === 'department' ? (
                  <DepartmentHeadView
                    allKPIs={allKPIs}
                    domainHealth={domainHealth}
                  />
                ) : viewMode === 'okr' ? (
                  <OKRIntegration
                    kpis={allKPIs}
                  />
                ) : viewMode === 'lineage' ? (
                  <DataLineageViewer
                    kpis={allKPIs}
                  />
                ) : (
                  <>
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

                    {/* Moneybird Financial KPIs Section */}
                    <div className="mb-6">
                      <FinancialKPISection />
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
        isPinned={selectedKPI ? isPinned(selectedKPI.id) : false}
        onTogglePin={() => selectedKPI && togglePin(selectedKPI.id, selectedKPI.domain)}
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

      {/* Command Palette */}
      <KPICommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        kpis={allKPIs}
        pinnedKPIIds={pinnedSet}
        onSelectKPI={(kpi) => { setSelectedKPI(kpi); setCommandPaletteOpen(false); }}
        onTogglePin={(id) => togglePin(id)}
        onConfigureAlert={(kpi) => { setAlertKPI(kpi); setCommandPaletteOpen(false); }}
        onExport={() => { exportToCSV(allKPIs, 'all-kpis'); toast.success('Exported to CSV'); }}
        onRefresh={handleRefresh}
      />

      {/* Board Report Generator */}
      <BoardReportGenerator
        open={boardReportOpen}
        onOpenChange={setBoardReportOpen}
        allKPIs={allKPIs}
        domainHealth={domainHealth}
        overallHealth={overallHealth}
      />

      {/* Report Builder */}
      <KPIReportBuilder
        open={reportBuilderOpen}
        onOpenChange={setReportBuilderOpen}
        allKPIs={allKPIs}
      />
    </div>
  );
}
