import { useState } from "react";
import { useDealPipeline, useDealStages, useUpdateDealStage, Deal } from "@/hooks/useDealPipeline";
import { MissingFeeWarning } from "./MissingFeeWarning";
import { DealCard } from "./DealCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";

export function DealPipelineKanban() {
  const { data: stages, isLoading: stagesLoading } = useDealStages();
  const { data: deals, isLoading: dealsLoading } = useDealPipeline();
  const updateDealStage = useUpdateDealStage();
  const queryClient = useQueryClient();
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (stageName: string) => {
    if (!draggedDeal || draggedDeal.deal_stage === stageName) {
      setDraggedDeal(null);
      return;
    }

    // Auto-activate draft jobs when moving forward
    const shouldAutoActivate = draggedDeal.status === 'draft' && stageName !== 'New';
    
    if (shouldAutoActivate) {
      try {
        const { error } = await supabase
          .from('jobs')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            deal_stage: stageName,
            last_activity_date: new Date().toISOString()
          })
          .eq('id', draggedDeal.id);

        if (error) throw error;

        toast.success(`Job activated and moved to ${stageName}`, {
          description: 'The job is now live and accepting applications'
        });
        
        queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] });
      } catch (error) {
        console.error('Error activating job:', error);
        toast.error('Failed to update deal');
      } finally {
        setDraggedDeal(null);
      }
    } else {
      updateDealStage.mutate(
        { dealId: draggedDeal.id, newStage: stageName },
        {
          onSuccess: () => {
            toast.success(`Deal moved to ${stageName}`);
            setDraggedDeal(null);
          },
          onError: () => {
            toast.error('Failed to update deal stage');
            setDraggedDeal(null);
          },
        }
      );
    }
  };

  const handlePublishDeal = async (dealId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          last_activity_date: new Date().toISOString()
        })
        .eq('id', dealId);

      if (error) throw error;

      toast.success('Job activated and published!', {
        description: 'Candidates can now discover and apply to this opportunity'
      });
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      queryClient.invalidateQueries({ queryKey: ['deal-pipeline'] });
    } catch (error) {
      console.error('Error publishing deal:', error);
      toast.error('Failed to activate job');
    }
  };

  // Case-insensitive stage matching for robustness
  const getDealsByStage = (stageName: string) => {
    return deals?.filter(deal => 
      deal.deal_stage?.toLowerCase() === stageName.toLowerCase()
    ) || [];
  };

  const getStageValue = (stageName: string) => {
    const stageDeals = getDealsByStage(stageName);
    const stage = stages?.find(s => s.name.toLowerCase() === stageName.toLowerCase());
    const probability = stage?.probability_weight || 0;
    
    return stageDeals.reduce((sum, deal) => {
      const value = deal.estimated_value || 0;
      return sum + (value * probability / 100);
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (stagesLoading || dealsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <MissingFeeWarning />
      <ScrollArea className="w-full">
        <div className="flex gap-4 p-1 min-w-max">
        {stages?.map((stage) => {
          const stageDeals = getDealsByStage(stage.name);
          const stageValue = getStageValue(stage.name);

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.name)}
            >
              {/* Stage Header */}
              <Card className="mb-4 p-4 bg-card/30 backdrop-blur-sm border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="font-semibold text-sm text-foreground">
                      {stage.name}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {stageDeals.length}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground mb-1">
                  {stage.description}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Weighted Value</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(stageValue)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-muted-foreground">Probability</span>
                  <span className="font-medium text-primary">
                    {stage.probability_weight}%
                  </span>
                </div>
              </Card>

              {/* Deal Cards */}
              <div className="space-y-3">
                {stageDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onDragStart={handleDragStart}
                    onPublish={handlePublishDeal}
                  />
                ))}
                
                {stageDeals.length === 0 && (
                  <Card className="p-8 text-center border-dashed border-border/50 bg-muted/20">
                    <p className="text-sm text-muted-foreground">
                      No deals in this stage
                    </p>
                  </Card>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
    </>
  );
}
