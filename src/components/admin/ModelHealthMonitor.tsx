import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, AlertCircle } from "lucide-react";

export function ModelHealthMonitor() {
  const { data: modelHealth } = useQuery({
    queryKey: ['model-health'],
    queryFn: async () => {
      const { data: activeModel } = await supabase
        .from('ml_models')
        .select('*')
        .eq('status', 'active')
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (!activeModel) return null;

      const { data: recentPredictions } = await supabase
        .from('ml_predictions')
        .select('prediction_score, actual_outcome')
        .eq('model_version', activeModel.version)
        .not('actual_outcome', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      const totalPredictions = recentPredictions?.length || 0;
      const hiredCount = recentPredictions?.filter(p => p.actual_outcome === 'hired').length || 0;
      const interviewedCount = recentPredictions?.filter(p => p.actual_outcome === 'interviewed').length || 0;

      return {
        model: activeModel,
        total_predictions: totalPredictions,
        hired_count: hiredCount,
        interviewed_count: interviewedCount,
        hire_rate: totalPredictions > 0 ? (hiredCount / totalPredictions) : 0,
        interview_rate: totalPredictions > 0 ? (interviewedCount / totalPredictions) : 0
      };
    },
    refetchInterval: 10000
  });

  if (!modelHealth?.model) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="w-5 h-5" />
          <p>No active ML model. Train a model to see health metrics.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Model Health</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Active Model</p>
          <p className="text-xl font-bold">v{modelHealth.model.version} ({modelHealth.model.model_type})</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">AUC-ROC</p>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <p className="text-lg font-semibold">
                {((modelHealth.model.metrics as any)?.auc_roc as number)?.toFixed(3) || 'N/A'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Precision@10</p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <p className="text-lg font-semibold">
                {((modelHealth.model.metrics as any)?.precision_at_10 as number)?.toFixed(3) || 'N/A'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Recent Predictions</p>
            <p className="text-lg font-semibold">{modelHealth.total_predictions}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Hire Rate</p>
            <p className="text-lg font-semibold">
              {(modelHealth.hire_rate * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Trained: {new Date(modelHealth.model.created_at).toLocaleDateString()}
          </p>
          {modelHealth.model.training_data_count && (
            <p className="text-xs text-muted-foreground">
              Training samples: {modelHealth.model.training_data_count}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
