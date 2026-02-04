import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { RefreshCw, TrendingUp, Mail, Eye, MessageSquare, MousePointer } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface SequenceStep {
  id: string;
  step_number: number;
  variant_id: string | null;
  variant_label: string | null;
  subject_line: string | null;
  sent_count: number;
  open_count: number;
  reply_count: number;
  click_count: number;
  bounce_count: number;
  open_rate: number | null;
  reply_rate: number | null;
  click_rate: number | null;
}

interface SequencePerformanceChartProps {
  campaignId?: string;
  externalCampaignId?: string;
}

export function SequencePerformanceChart({ campaignId, externalCampaignId }: SequencePerformanceChartProps) {
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchSteps = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('instantly_sequence_steps')
        .select('*')
        .order('step_number', { ascending: true });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      } else if (externalCampaignId) {
        query = query.eq('external_campaign_id', externalCampaignId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sequence steps:', error);
        return;
      }

      setSteps(data || []);
    } catch (error) {
      console.error('Error fetching sequence steps:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncSteps = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-instantly-sequence-steps', {
        body: externalCampaignId ? { campaignId: externalCampaignId } : undefined,
      });

      if (error) throw error;

      toast.success('Sequence steps synced successfully');
      await fetchSteps();
    } catch (error: any) {
      console.error('Error syncing sequence steps:', error);
      toast.error(error.message || 'Failed to sync sequence steps');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchSteps();
  }, [campaignId, externalCampaignId]);

  // Find best performing step
  const bestStep = steps.reduce((best, step) => {
    if (!best || (step.reply_rate || 0) > (best.reply_rate || 0)) {
      return step;
    }
    return best;
  }, null as SequenceStep | null);

  // Prepare chart data
  const chartData = steps.map((step) => ({
    name: `Email ${step.step_number}${step.variant_label ? ` (${step.variant_label})` : ''}`,
    stepNumber: step.step_number,
    sent: step.sent_count,
    opened: step.open_count,
    clicked: step.click_count,
    replied: step.reply_count,
    openRate: step.open_rate || 0,
    replyRate: step.reply_rate || 0,
    isBest: bestStep?.id === step.id,
  }));

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (steps.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Sequence Performance
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={syncSteps}
            disabled={syncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Steps
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No sequence steps found</p>
            <p className="text-xs mt-1">Click "Sync Steps" to fetch data from Instantly</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Sequence Performance
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Performance breakdown by email step
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={syncSteps}
            disabled={syncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Steps
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Best Performing Step Highlight */}
          {bestStep && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-lg bg-primary/10 border border-primary/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="bg-primary">
                  Best Performer
                </Badge>
                <span className="text-sm font-medium">
                  Email {bestStep.step_number}
                  {bestStep.variant_label && ` (${bestStep.variant_label})`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{bestStep.sent_count.toLocaleString()} sent</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span>{(bestStep.open_rate || 0).toFixed(1)}% opened</span>
                </div>
                <div className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4 text-amber-500" />
                  <span>{(bestStep.click_rate || 0).toFixed(1)}% clicked</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  <span>{(bestStep.reply_rate || 0).toFixed(1)}% replied</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Chart */}
          <div className="h-64">
            <DynamicChart
              type="bar"
              data={chartData}
              height={256}
              config={{
                xAxisKey: 'name',
                bars: [
                  { dataKey: 'sent', name: 'Sent', fill: 'hsl(var(--muted-foreground))', radius: [4, 4, 0, 0] },
                  { dataKey: 'opened', name: 'Opened', fill: 'hsl(var(--primary))', radius: [4, 4, 0, 0] },
                  { dataKey: 'replied', name: 'Replied', fill: 'hsl(142 76% 36%)', radius: [4, 4, 0, 0] },
                ],
                showTooltip: true,
                legend: true,
                margin: { top: 5, right: 30, left: 20, bottom: 5 },
              }}
            />
          </div>

          {/* Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border ${
                  bestStep?.id === step.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 bg-card/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">
                    Email {step.step_number}
                    {step.variant_label && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {step.variant_label}
                      </Badge>
                    )}
                  </span>
                  {bestStep?.id === step.id && (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      Best
                    </Badge>
                  )}
                </div>
                
                {step.subject_line && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                    {step.subject_line}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span>{step.sent_count.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-blue-500" />
                    <span>{(step.open_rate || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MousePointer className="h-3 w-3 text-amber-500" />
                    <span>{(step.click_rate || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-green-500" />
                    <span>{(step.reply_rate || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
