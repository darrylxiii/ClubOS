import { useState, useMemo, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Upload, 
  Plus,
  RefreshCw,
  Keyboard,
} from 'lucide-react';
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
import { useCRMKeyboardShortcuts } from '@/hooks/useCRMKeyboardShortcuts';
import { PROSPECT_STAGES, type CRMProspect, type ProspectStage } from '@/types/crm-enterprise';
import { EnhancedKanbanColumn } from '@/components/crm/EnhancedKanbanColumn';
import { EnhancedProspectCard } from '@/components/crm/EnhancedProspectCard';
import { CSVImportDialog } from '@/components/crm/CSVImportDialog';
import { AddProspectDialog } from '@/components/crm/AddProspectDialog';
import { CRMEmptyState } from '@/components/crm/CRMEmptyState';
import { CRMKeyboardShortcutsDialog } from '@/components/crm/CRMKeyboardShortcutsDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Primary stages (visible by default)
const PRIMARY_STAGES = ['new', 'contacted', 'replied', 'qualified', 'meeting_booked', 'closed_won'];

export default function ProspectPipeline() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addProspectOpen, setAddProspectOpen] = useState(false);
  const [addProspectStage, setAddProspectStage] = useState<ProspectStage>('new');
  const [activeProspect, setActiveProspect] = useState<CRMProspect | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { showHelp, setShowHelp } = useCRMKeyboardShortcuts({
    onAddProspect: () => handleAddProspect('new'),
    onSearch: () => searchInputRef.current?.focus(),
  });

  const { prospects, loading, refetch, updateProspectStage } = useCRMProspects({ 
    search: searchQuery || undefined,
    campaignId: selectedCampaign !== 'all' ? selectedCampaign : undefined,
  });
  const { campaigns } = useCRMCampaigns({});

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

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 px-6 py-4 border-b border-border/30 bg-gradient-to-r from-card/50 to-transparent backdrop-blur-xl"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Prospect Pipeline</h1>
                <p className="text-sm text-muted-foreground">
                  {prospects.length} prospects • Drag to move stages
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
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
                  <div className="flex gap-4 p-6 min-w-max">
                    {visibleStages.map((stage) => (
                      <EnhancedKanbanColumn
                        key={stage.value}
                        stage={stage}
                        prospects={prospectsByStage[stage.value] || []}
                        onAddProspect={handleAddProspect}
                        isCollapsed={collapsedColumns.has(stage.value)}
                        onToggleCollapse={() => toggleColumnCollapse(stage.value)}
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
        </div>

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
      </RoleGate>
    </AppLayout>
  );
}
