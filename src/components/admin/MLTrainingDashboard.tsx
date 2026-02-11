import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import { Loader2, Brain, TrendingUp } from 'lucide-react';

export function MLTrainingDashboard() {
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateEmbeddings = async () => {
    setGeneratingEmbeddings(true);
    try {
      const { data: candidateData, error: candidateError } = await supabase.functions.invoke(
        'batch-generate-embeddings',
        { body: { entity_type: 'candidate', limit: 100 } }
      );
      if (candidateError) throw candidateError;

      const { data: jobData, error: jobError } = await supabase.functions.invoke(
        'batch-generate-embeddings',
        { body: { entity_type: 'job', limit: 100 } }
      );
      if (jobError) throw jobError;

      notify.success("Embeddings Generated", {
        description: `${candidateData.processed} candidates, ${jobData.processed} jobs`
      });
    } catch (error: unknown) {
      notify.error("Error", { description: error instanceof Error ? error.message : 'An unexpected error occurred' });
    } finally {
      setGeneratingEmbeddings(false);
    }
  };

  const prepareTrainingData = async () => {
    setPreparing(true);
    try {
      const { data, error } = await supabase.functions.invoke('prepare-training-data', {
        body: { limit: 1000, include_semantic: true }
      });

      if (error) throw error;

      notify.success("Training Data Prepared", {
        description: `Generated ${data.count} training samples with ${data.semantic_scores} semantic scores`,
      });
    } catch (error: unknown) {
      notify.error("Error", { description: error instanceof Error ? error.message : 'An unexpected error occurred' });
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

      notify.success("Model Training Complete", {
        description: `Model v${data.model_version} trained with AUC: ${data.metrics.auc_roc.toFixed(3)}`,
      });
    } catch (error: unknown) {
      notify.error("Training Failed", { description: error instanceof Error ? error.message : 'An unexpected error occurred' });
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
          <Button onClick={generateEmbeddings} disabled={generatingEmbeddings} className="w-full">
            {generatingEmbeddings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            1. Generate Embeddings
          </Button>
          <Button onClick={prepareTrainingData} disabled={preparing} variant="outline" className="w-full">
            {preparing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            2. Prepare Training Data
          </Button>
          <Button onClick={trainModel} disabled={loading} variant="outline" className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            3. Train Model
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
