import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Upload, 
  Plus,
  RefreshCw,
  MoreHorizontal,
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  Zap
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
import { PROSPECT_STAGES, type CRMProspect, type ProspectStage } from '@/types/crm-enterprise';
import { ProspectKanbanColumn } from '@/components/crm/ProspectKanbanColumn';
import { ProspectCard } from '@/components/crm/ProspectCard';
import { CSVImportDialog } from '@/components/crm/CSVImportDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';

export default function ProspectPipeline() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [activeProspect, setActiveProspect] = useState<CRMProspect | null>(null);

  const { prospects, loading, refetch, updateProspectStage } = useCRMProspects({ 
    search: searchQuery || undefined,
    campaignId: selectedCampaign !== 'all' ? selectedCampaign : undefined,
  });
  const { campaigns } = useCRMCampaigns({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
    if (prospect) {
      setActiveProspect(prospect);
    }
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
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search prospects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48 bg-muted/20 border-border/30"
                  />
                </div>

                {/* Campaign Filter */}
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
              </div>
            </div>
          </motion.div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex gap-4 p-6 overflow-x-auto">
                {PROSPECT_STAGES.slice(0, 6).map((stage) => (
                  <div key={stage.value} className="flex-shrink-0 w-72">
                    <Skeleton className="h-10 w-full mb-3" />
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
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
                    {PROSPECT_STAGES.map((stage) => (
                      <ProspectKanbanColumn
                        key={stage.value}
                        stage={stage}
                        prospects={prospectsByStage[stage.value] || []}
                      />
                    ))}
                  </div>

                  <DragOverlay>
                    {activeProspect && (
                      <ProspectCard prospect={activeProspect} isDragging />
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
      </RoleGate>
    </AppLayout>
  );
}
