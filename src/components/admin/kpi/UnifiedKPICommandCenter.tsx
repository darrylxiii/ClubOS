import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUnifiedKPIs, type KPIDomain } from '@/hooks/useUnifiedKPIs';
import { ExecutiveSummaryBar } from './ExecutiveSummaryBar';
import { DomainSidebar } from './DomainSidebar';
import { KPIOverview } from './KPIOverview';
import { CategoryView } from './CategoryView';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export function UnifiedKPICommandCenter() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  } = useUnifiedKPIs();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
      toast.success('All KPIs refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh KPIs');
    } finally {
      setIsRefreshing(false);
    }
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
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
            {selectedCategory ? (
              <CategoryView
                domain={selectedDomain as KPIDomain}
                category={selectedCat!}
                categoryDisplayName={categoryDisplayName}
                kpis={selectedKPIs}
                onBack={handleSelectOverview}
              />
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight">KPI Command Center</h1>
                  <p className="text-muted-foreground">
                    Unified view of all platform metrics across Operations, Website, and Sales
                  </p>
                </div>
                <KPIOverview
                  domainHealth={domainHealth}
                  criticalAlerts={criticalAlerts}
                  allKPIs={allKPIs}
                  onSelectCategory={handleSelectCategory}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
