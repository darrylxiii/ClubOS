import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Search,
  Upload,
  Plus,
  RefreshCw,
  Keyboard,
  Filter,
  X,
  Zap,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { useCRMProspects } from '@/hooks/useCRMProspects';
import { useCRMCampaigns } from '@/hooks/useCRMCampaigns';
import { useCRMOwners } from '@/hooks/useCRMOwners';
import { useCRMKeyboardShortcuts } from '@/hooks/useCRMKeyboardShortcuts';
import { useSyncDiagnostics, getSyncErrors } from '@/hooks/useSyncDiagnostics';
import { CRMRealtimeProvider, useCRMRealtime } from '@/components/crm/CRMRealtimeProvider';
import { PROSPECT_STAGES, type CRMProspect, type ProspectStage } from '@/types/crm-enterprise';
import { EnhancedKanbanColumn } from '@/components/crm/EnhancedKanbanColumn';
import { EnhancedProspectCard } from '@/components/crm/EnhancedProspectCard';
import { CSVImportDialog } from '@/components/crm/CSVImportDialog';
import { AddProspectDialog } from '@/components/crm/AddProspectDialog';
import { CRMEmptyState } from '@/components/crm/CRMEmptyState';
import { CRMKeyboardShortcutsDialog } from '@/components/crm/CRMKeyboardShortcutsDialog';
import { BulkActionsBar } from '@/components/crm/BulkActionsBar';
import { SyncStatusBadge } from '@/components/crm/SyncStatusBadge';
import { InlineLoader } from '@/components/ui/unified-loader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Hot leads only - prospects who have replied or shown interest
const PRIMARY_STAGES = ['replied', 'qualified', 'meeting_booked', 'proposal_sent', 'negotiation', 'closed_won'];

// Sync timeout in ms (30 seconds)
const SYNC_TIMEOUT_MS = 30000;

function ProspectPipelineContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addProspectOpen, setAddProspectOpen] = useState(false);
  const [addProspectStage, setAddProspectStage] = useState<ProspectStage>('new');
  const [activeProspect, setActiveProspect] = useState<CRMProspect | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [syncingInstantly, setSyncingInstantly] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { showHelp, setShowHelp } = useCRMKeyboardShortcuts({
    onAddProspect: () => handleAddProspect('new'),
    onSearch: () => searchInputRef.current?.focus(),
  });

  // Use realtime context for live updates
  const { lastUpdate } = useCRMRealtime();

  const { prospects, loading, refetch, updateProspectStage, deleteProspect } = useCRMProspects({
    search: searchQuery || undefined,
    campaignId: selectedCampaign !== 'all' ? selectedCampaign : undefined,
    ownerId: selectedOwner !== 'all' ? selectedOwner : undefined,
    minScore: scoreRange[0] > 0 ? scoreRange[0] : undefined,
    maxScore: scoreRange[1] < 100 ? scoreRange[1] : undefined,
  });
  const { campaigns } = useCRMCampaigns({});
  const { owners } = useCRMOwners();
  const { data: syncDiagnostics, refetch: refetchSyncLog } = useSyncDiagnostics();
  const lastSyncLog = syncDiagnostics?.lastSync || null;

  // Auto-refresh on page visit and visibility change
  useEffect(() => {
    // Refetch on mount to ensure fresh data
    refetch();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Filter to show primary stages first
  const visibleStages = useMemo(() => {
    return PROSPECT_STAGES.filter(stage => PRIMARY_STAGES.includes(stage.value));
  }, []);

  // Group prospects by stage
  const prospectsByStage = useMemo(() => {
    const grouped: Record<ProspectStage, CRMProspect[]> = {} as any;
    PROSPECT_STAGES.forEach(stage => {
      grouped[stage.value] = [];
    });
    prospects.forEach(prospect => {
      if (grouped[prospect.stage]) {
        grouped[prospect.stage].push(prospect);
      }
    });
    return grouped;
  }, [prospects]);

  // Check if filters are active
  const hasActiveFilters = selectedOwner !== 'all' || scoreRange[0] > 0 || scoreRange[1] < 100;

  const handleDragStart = (event: DragStartEvent) => {
    const prospect = prospects.find(p => p.id === event.active.id);
    if (prospect) setActiveProspect(prospect);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveProspect(null);
    const { active, over } = event;
    if (!over) return;

    const prospectId = active.id as string;
    const newStage = over.id as ProspectStage;
    const prospect = prospects.find(p => p.id === prospectId);
    if (prospect && prospect.stage !== newStage) {
      updateProspectStage(prospectId, newStage);
    }
  };

  const handleAddProspect = (stage: ProspectStage) => {
    setAddProspectStage(stage);
    setAddProspectOpen(true);
  };

  const toggleColumnCollapse = (stageValue: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(stageValue)) {
        next.delete(stageValue);
      } else {
        next.add(stageValue);
      }
      return next;
    });
  };

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkArchive = useCallback(async () => {
    const count = selectedIds.size;
    for (const id of selectedIds) {
      await updateProspectStage(id, 'closed_lost');
    }
    toast.success(`Archived ${count} prospects`);
    setSelectedIds(new Set());
  }, [selectedIds, updateProspectStage]);

  const handleBulkMarkActioned = useCallback(async () => {
    const count = selectedIds.size;
    for (const id of selectedIds) {
      await updateProspectStage(id, 'contacted');
    }
    toast.success(`Marked ${count} prospects as contacted`);
    setSelectedIds(new Set());
  }, [selectedIds, updateProspectStage]);

  const handleBulkAssignClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    // For now, assign to the first available owner as a quick action
    if (owners.length > 0) {
      const assignToOwner = async () => {
        const count = selectedIds.size;
        try {
          for (const id of selectedIds) {
            await supabase
              .from('crm_prospects')
              .update({ owner_id: owners[0].id })
              .eq('id', id);
          }
          toast.success(`Assigned ${count} prospects to ${owners[0].full_name}`);
          setSelectedIds(new Set());
          refetch();
        } catch (error) {
          console.error('Bulk assign error:', error);
          toast.error('Failed to assign prospects');
        }
      };
      assignToOwner();
    } else {
      toast.info('No owners available for assignment');
    }
  }, [selectedIds, owners, refetch]);

  const clearFilters = () => {
    setSelectedOwner('all');
    setScoreRange([0, 100]);
    setFiltersOpen(false);
  };

  // Sync leads from Instantly with timeout guard
  const handleSyncFromInstantly = async () => {
    setSyncingInstantly(true);
    toast.info('Starting sync from Instantly…');

    // Debug: Log connection details
    console.log('[Sync] Starting sync...', {
      supabaseUrl: (supabase as any).supabaseUrl,
      function: 'sync-instantly-leads'
    });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, SYNC_TIMEOUT_MS);

    try {
      const { data, error } = await supabase.functions.invoke('sync-instantly-leads', {
        body: { direction: 'instantly_to_crm', mode: 'hot' }, // Use hot mode for speed
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error('[Sync] Invocation Error:', error);
        throw error;
      };

      // Parse response correctly - edge function returns data.stats.instantly_imported
      const stats = data?.stats || {};
      const imported = stats.instantly_imported || 0;
      const updated = stats.instantly_updated || 0;
      const errorCount = stats.errors || 0;

      // Always refetch after sync to show any updates
      await Promise.all([refetch(), refetchSyncLog()]);

      if (imported > 0 || updated > 0) {
        toast.success(`Synced: ${imported} new • ${updated} updated${errorCount > 0 ? ` • ${errorCount} errors` : ''}`);
      } else if (errorCount > 0) {
        // Show first error if available
        const firstError = data?.errors?.[0]?.error || 'Unknown error';
        toast.error(`Sync failed: ${firstError}`);
      } else {
        toast.info('All leads are up to date');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Check if it was a timeout
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        toast.info('Sync is still running in the background. Results will appear after refresh.');
        // Still refetch in case some data came through
        setTimeout(() => {
          refetch();
          refetchSyncLog();
        }, 5000);
      } else {
        console.error('Error syncing from Instantly:', error);
        // Enhanced error message
        const msg = error.message || 'Failed to sync from Instantly';
        const context = error.context ? ` (${JSON.stringify(error.context)})` : '';
        toast.error(`${msg}${context}. Check console for details.`);
      }
    } finally {
      setSyncingInstantly(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-6 py-4 border-b border-border/30 bg-gradient-to-r from-card/50 to-transparent backdrop-blur-xl"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold">Prospect Pipeline</h1>
              <p className="text-sm text-muted-foreground">
                {prospects.length} prospects • Drag to move stages
                {lastUpdate && (
                  <span className="ml-2 text-xs text-primary">• Live</span>
                )}
              </p>
            </div>
            <SyncStatusBadge
              isSyncing={syncingInstantly}
              lastSync={lastSyncLog}
              syncErrors={getSyncErrors(lastSyncLog)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search prospects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48 bg-muted/20 border-border/30"
              />
            </div>

            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-40 bg-muted/20 border-border/30">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Advanced Filters Popover */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={hasActiveFilters ? 'border-primary' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {(selectedOwner !== 'all' ? 1 : 0) + (scoreRange[0] > 0 || scoreRange[1] < 100 ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Advanced Filters</h4>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Owner Filter */}
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Owners" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Owners</SelectItem>
                        {owners.map(owner => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Score Range Filter */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Lead Score Range</Label>
                      <span className="text-sm text-muted-foreground">
                        {scoreRange[0]} - {scoreRange[1]}
                      </span>
                    </div>
                    <Slider
                      value={scoreRange}
                      onValueChange={(value) => setScoreRange(value as [number, number])}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Apply Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleSyncFromInstantly}
                  disabled={syncingInstantly}
                  className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50"
                >
                  {syncingInstantly ? (
                    <>
                      <InlineLoader />
                      Syncing…
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2 text-purple-500" />
                      Sync Instantly
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pull hot leads (replied/interested/meeting booked) from Instantly</p>
              </TooltipContent>
            </Tooltip>

            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>

            <Button onClick={() => handleAddProspect('new')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Prospect
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowHelp(true)}>
                  <Keyboard className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Keyboard shortcuts (?)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex gap-4 p-6 overflow-x-auto">
            {visibleStages.map((stage) => (
              <div key={stage.value} className="flex-shrink-0 w-80">
                <Skeleton className="h-12 w-full mb-3 rounded-xl" />
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : prospects.length === 0 && !searchQuery ? (
          <div className="p-6">
            <CRMEmptyState
              type="no-prospects"
              onPrimaryAction={() => handleAddProspect('new')}
              onSecondaryAction={() => setImportDialogOpen(true)}
              showTips
            />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 p-2 md:p-6 min-w-max">
                {visibleStages.map((stage) => (
                  <EnhancedKanbanColumn
                    key={stage.value}
                    stage={stage}
                    prospects={prospectsByStage[stage.value] || []}
                    onAddProspect={handleAddProspect}
                    isCollapsed={collapsedColumns.has(stage.value)}
                    onToggleCollapse={() => toggleColumnCollapse(stage.value)}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeProspect && (
                  <EnhancedProspectCard prospect={activeProspect} isDragging />
                )}
              </DragOverlay>
            </DndContext>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onArchive={handleBulkArchive}
        onMarkActioned={handleBulkMarkActioned}
        onAssign={handleBulkAssignClick}
        onClearSelection={handleClearSelection}
      />

      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          refetch();
          setImportDialogOpen(false);
        }}
      />

      <AddProspectDialog
        open={addProspectOpen}
        onOpenChange={setAddProspectOpen}
        onSuccess={refetch}
        campaigns={campaigns}
        defaultStage={addProspectStage}
      />

      <CRMKeyboardShortcutsDialog
        open={showHelp}
        onOpenChange={setShowHelp}
      />
    </div>
  );
}

export default function ProspectPipeline() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <CRMRealtimeProvider>
          <ProspectPipelineContent />
        </CRMRealtimeProvider>
      </RoleGate>
    </AppLayout>
  );
}
