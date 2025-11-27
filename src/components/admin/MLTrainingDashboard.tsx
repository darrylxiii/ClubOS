import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Brain, TrendingUp } from 'lucide-react';

export function MLTrainingDashboard() {
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const { toast } = useToast();

  const prepareTrainingData = async () => {
    setPreparing(true);
    try {
      const { data, error } = await supabase.functions.invoke('prepare-training-data', {
        body: { limit: 1000, include_semantic: true }
      });

      if (error) throw error;

      toast({
        title: "Training Data Prepared",
        description: `Generated ${data.count} training samples with ${data.semantic_scores} semantic scores`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setPreparing(false);
    }
  };

  const trainModel = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('train-ml-model', {
        body: {
          n_estimators: 50,
          learning_rate: 0.1,
          max_depth: 6,
          validation_split: 0.2
        }
      });

      if (error) throw error;

      toast({
        title: "Model Training Complete",
        description: `Model v${data.model_version} trained with AUC: ${data.metrics.auc_roc.toFixed(3)}`,
      });
    } catch (error: any) {
      toast({
        title: "Training Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ML Training Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={prepareTrainingData}
              disabled={preparing}
              variant="outline"
            >
              {preparing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Prepare Training Data
            </Button>
            
            <Button
              onClick={trainModel}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <TrendingUp className="mr-2 h-4 w-4" />
              Train Model
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
