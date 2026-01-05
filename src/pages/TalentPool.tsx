import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { DashboardHeader } from '@/components/admin/shared/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, Table2, LayoutGrid } from 'lucide-react';
import {
  TalentPoolStats,
  SemanticSearchBar,
  TalentPoolFilters,
  TalentPoolTable,
  TalentPoolKanban,
  CandidateQuickView,
  LogTouchpointDialog,
  AddToListDialog,
} from '@/components/talent-pool';
import {
  useTalentPool,
  useSemanticSearch,
  TalentPoolFilters as Filters,
  TalentPoolCandidate,
  TalentTier,
} from '@/hooks/useTalentPool';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'table' | 'kanban';

export default function TalentPool() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<Filters>({});
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [quickViewCandidate, setQuickViewCandidate] = useState<TalentPoolCandidate | null>(null);
  const [touchpointDialogCandidate, setTouchpointDialogCandidate] = useState<TalentPoolCandidate | null>(null);
  const [addToListDialogCandidate, setAddToListDialogCandidate] = useState<TalentPoolCandidate | null>(null);

  const { candidates, stats, isLoading, refetch, updateTier } = useTalentPool(filters);
  const { search, results, lastQuery, isSearching, clearResults } = useSemanticSearch();

  // Use search results if available, otherwise use filtered candidates
  const displayCandidates = lastQuery ? results : candidates;

  const handleStatClick = useCallback((filter: string) => {
    switch (filter) {
      case 'hot':
        setFilters({ tiers: ['hot'] });
        break;
      case 'warm':
        setFilters({ tiers: ['warm'] });
        break;
      case 'strategic':
        setFilters({ tiers: ['strategic'] });
        break;
      case 'high-move':
        setFilters({ minMoveProbability: 70 });
        break;
      case 'needs-attention':
        setFilters({ tiers: ['hot', 'warm'], needsAttention: true });
        break;
      case 'all':
      default:
        setFilters({});
        break;
    }
    clearResults();
  }, [clearResults]);

  const handleSearch = useCallback((query: string) => {
    search({ query, filters });
  }, [search, filters]);

  const handleCandidateClick = useCallback((candidate: TalentPoolCandidate) => {
    setQuickViewCandidate(candidate);
  }, []);

  const handleViewProfile = useCallback((candidate?: TalentPoolCandidate) => {
    const targetCandidate = candidate || quickViewCandidate;
    if (targetCandidate) {
      navigate(`/candidate/${targetCandidate.id}`);
    }
  }, [navigate, quickViewCandidate]);

  const handleLogTouchpoint = useCallback((candidate?: TalentPoolCandidate) => {
    const targetCandidate = candidate || quickViewCandidate;
    if (targetCandidate) {
      setTouchpointDialogCandidate(targetCandidate);
    }
  }, [quickViewCandidate]);

  const handleAddToList = useCallback((candidate?: TalentPoolCandidate) => {
    const targetCandidate = candidate || quickViewCandidate;
    if (targetCandidate) {
      setAddToListDialogCandidate(targetCandidate);
    }
  }, [quickViewCandidate]);

  const handleTierChange = useCallback((candidateId: string, newTier: TalentTier) => {
    updateTier({ candidateId, tier: newTier, reason: 'Manual tier update from kanban' });
  }, [updateTier]);

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <DashboardHeader
          title="Talent Pool"
          description="AI-powered talent intelligence and pipeline management"
          onRefresh={refetch}
          isRefreshing={isLoading}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Candidate
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <TalentPoolStats
          stats={stats}
          isLoading={isLoading}
          onStatClick={handleStatClick}
        />

        {/* Semantic Search */}
        <SemanticSearchBar
          onSearch={handleSearch}
          isSearching={isSearching}
          resultCount={lastQuery ? results.length : undefined}
          lastQuery={lastQuery}
          onClear={clearResults}
        />

        {/* Filters and View Toggle */}
        <div className="flex items-center justify-between gap-4">
          <TalentPoolFilters
            filters={filters}
            onFiltersChange={setFilters}
          />
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="table" className="gap-2">
                <Table2 className="h-4 w-4" />
                Table
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        {viewMode === 'table' ? (
          <TalentPoolTable
            candidates={displayCandidates}
            isLoading={isLoading && !lastQuery}
            selectedIds={selectedCandidateIds}
            onSelectChange={setSelectedCandidateIds}
            onCandidateClick={handleCandidateClick}
            onLogTouchpoint={handleLogTouchpoint}
            onAddToList={handleAddToList}
            onViewProfile={handleViewProfile}
          />
        ) : (
          <TalentPoolKanban
            candidates={displayCandidates}
            isLoading={isLoading && !lastQuery}
            onTierChange={handleTierChange}
            onCandidateClick={handleCandidateClick}
            onLogTouchpoint={handleLogTouchpoint}
            onAddToList={handleAddToList}
            onViewProfile={handleViewProfile}
          />
        )}

        {/* Quick View Panel */}
        <CandidateQuickView
          candidate={quickViewCandidate}
          open={!!quickViewCandidate}
          onOpenChange={(open) => !open && setQuickViewCandidate(null)}
          onViewFullProfile={() => handleViewProfile()}
          onLogTouchpoint={() => handleLogTouchpoint()}
          onAddToList={() => handleAddToList()}
        />

        {/* Log Touchpoint Dialog */}
        <LogTouchpointDialog
          candidateId={touchpointDialogCandidate?.id || ''}
          candidateName={touchpointDialogCandidate?.full_name || ''}
          open={!!touchpointDialogCandidate}
          onOpenChange={(open) => !open && setTouchpointDialogCandidate(null)}
          onSuccess={() => refetch()}
        />

        {/* Add to List Dialog */}
        <AddToListDialog
          candidateId={addToListDialogCandidate?.id || ''}
          candidateName={addToListDialogCandidate?.full_name || ''}
          open={!!addToListDialogCandidate}
          onOpenChange={(open) => !open && setAddToListDialogCandidate(null)}
          onSuccess={() => refetch()}
        />
      </div>
    </AppLayout>
  );
}
