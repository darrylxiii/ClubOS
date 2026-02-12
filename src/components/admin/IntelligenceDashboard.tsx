import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, Activity, Zap } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function IntelligenceDashboard() {
  const [processing, setProcessing] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const { data: queueStats, refetch: refetchQueue } = useQuery({
    queryKey: ['intelligence-queue-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intelligence_queue')
        .select('status, processing_type')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const stats = {
        pending: data?.filter(i => i.status === 'pending').length || 0,
        processing: data?.filter(i => i.status === 'processing').length || 0,
        completed: data?.filter(i => i.status === 'completed').length || 0,
        failed: data?.filter(i => i.status === 'failed').length || 0,
        byType: {} as Record<string, number>
      };
      
      data?.forEach(item => {
        stats.byType[item.processing_type] = (stats.byType[item.processing_type] || 0) + 1;
      });
      
      return stats;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 15000,
  });

  const { data: hiringIntents } = useQuery({
    queryKey: ['hiring-intents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('name, hiring_intent_score')
        .not('hiring_intent_score', 'is', null)
        .order('hiring_intent_score', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  const processQueue = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-intelligence-queue', {
        body: { batch_size: 20 }
      });
      
      if (error) throw error;
      
      toast.success(`Processed ${data.success} items successfully`);
      refetchQueue();
    } catch (error) {
      console.error('Process error:', error);
      toast.error('Failed to process queue');
    } finally {
      setProcessing(false);
    }
  };

  const calculateIntent = async () => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-hiring-intent', {
        body: {}
      });
      
      if (error) throw error;
      
      toast.success(`Calculated intent for ${data.processed_companies} companies`);
    } catch (error) {
      console.error('Calculate error:', error);
      toast.error('Failed to calculate hiring intent');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Intelligence Pipeline</h2>
        <p className="text-muted-foreground">Real-time processing and insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{queueStats?.pending || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-2xl font-bold">{queueStats?.processing || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{queueStats?.completed || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold">{queueStats?.failed || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Processing Actions</h3>
          <div className="space-y-3">
            <Button 
              onClick={processQueue} 
              disabled={processing}
              className="w-full"
            >
              {processing ? 'Processing...' : 'Process Queue'}
            </Button>
            <Button 
              onClick={calculateIntent} 
              disabled={calculating}
              variant="outline"
              className="w-full"
            >
              {calculating ? 'Calculating...' : 'Calculate Hiring Intent'}
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Hiring Intent</h3>
          <div className="space-y-2">
            {hiringIntents?.map((company) => (
              <div key={company.name} className="flex justify-between items-center">
                <span className="text-sm">{company.name}</span>
                <span className="text-sm font-semibold">
                  {company.hiring_intent_score?.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Processing Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {queueStats?.byType && Object.entries(queueStats.byType).map(([type, count]) => (
            <div key={type} className="text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{type}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
