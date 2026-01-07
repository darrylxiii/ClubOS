import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { DashboardHeader } from '@/components/admin/shared/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, Table2, LayoutGrid, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  TalentPoolStats,
  SemanticSearchBar,
  TalentPoolFilters,
  TalentPoolTable,
  TalentPoolKanban,
  CandidateQuickView,
  LogTouchpointDialog,
  AddToListDialog,
  ImportCandidatesDialog,
  AddCandidateDialog,
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
  const [isBulkCalculating, setIsBulkCalculating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { candidates, stats, isLoading, refetch, updateTier, fetchNextPage, hasNextPage, isFetchingNextPage } = useTalentPool(filters);
  const { search, results, lastQuery, isSearching, clearResults } = useSemanticSearch();

  // Handle bulk move probability calculation
  const handleBulkCalculate = useCallback(async () => {
    setIsBulkCalculating(true);
    const toastId = toast.loading('Calculating move probabilities...');
    
    try {
      const { data, error } = await supabase.functions.invoke('calculate-move-probability-bulk', {
        body: { force_recalculate: false }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(
          `Processed ${data.result.processed} candidates. Updated: ${data.result.updated}, Skipped: ${data.result.skipped}`,
          { id: toastId }
        );
        refetch();
      } else {
        throw new Error(data?.error || 'Calculation failed');
      }
    } catch (error) {
      console.error('Bulk calculation error:', error);
      toast.error('Failed to calculate move probabilities', { id: toastId });
    } finally {
      setIsBulkCalculating(false);
    }
  }, [refetch]);

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

  const handleScheduleInterview = useCallback(() => {
    if (quickViewCandidate) {
      navigate(`/schedule?candidateId=${quickViewCandidate.id}`);
    }
  }, [navigate, quickViewCandidate]);

  const handleGenerateDossier = useCallback(async () => {
    if (!quickViewCandidate) return;
    const toastId = toast.loading('Generating dossier...');
    try {
      const { error } = await supabase.functions.invoke('generate-candidate-dossier', {
        body: { candidate_id: quickViewCandidate.id }
      });
      if (error) throw error;
      toast.success('Dossier generated successfully', { id: toastId });
    } catch (error) {
      console.error('Dossier error:', error);
      toast.error('Failed to generate dossier', { id: toastId });
    }
  }, [quickViewCandidate]);

  const handleWhatsApp = useCallback(() => {
    if (quickViewCandidate?.phone) {
      const cleanPhone = quickViewCandidate.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  }, [quickViewCandidate]);

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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBulkCalculate}
                disabled={isBulkCalculating}
              >
                {isBulkCalculating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Calculate Probabilities
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
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
            hasNextPage={!lastQuery && hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
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
          onScheduleInterview={handleScheduleInterview}
          onGenerateDossier={handleGenerateDossier}
          onWhatsApp={handleWhatsApp}
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

        {/* Import Candidates Dialog */}
        <ImportCandidatesDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onSuccess={() => refetch()}
        />

        {/* Add Candidate Dialog */}
        <AddCandidateDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={() => refetch()}
        />
      </div>
    </AppLayout>
  );
}
