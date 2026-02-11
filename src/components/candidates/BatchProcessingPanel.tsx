import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Tags, Brain, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BatchJob {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  status: 'idle' | 'running' | 'done' | 'error';
  processed: number;
  total: number;
  errorMsg?: string;
}

export function BatchProcessingPanel() {
  const [jobs, setJobs] = useState<BatchJob[]>([
    { id: 'enrich', label: 'AI Enrich Profiles', icon: <Sparkles className="w-4 h-4" />, description: 'Generate AI summaries, talent tiers, and move probability', status: 'idle', processed: 0, total: 0 },
    { id: 'autotag', label: 'Auto-Tag Candidates', icon: <Tags className="w-4 h-4" />, description: 'Assign structured tags based on title, company, and history', status: 'idle', processed: 0, total: 0 },
    { id: 'embedding', label: 'Generate Embeddings', icon: <Brain className="w-4 h-4" />, description: 'Create semantic vectors for similarity matching', status: 'idle', processed: 0, total: 0 },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateJob = (id: string, updates: Partial<BatchJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const runBatchJob = async (jobId: string, functionName: string) => {
    // Get all candidate IDs
    const { data: candidates, error } = await supabase
      .from('candidate_profiles')
      .select('id')
      .limit(500);

    if (error || !candidates?.length) {
      updateJob(jobId, { status: 'error', errorMsg: error?.message || 'No candidates found' });
      return;
    }

    updateJob(jobId, { status: 'running', total: candidates.length, processed: 0 });

    let processed = 0;
    const batchSize = 5;

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const promises = batch.map(c =>
        supabase.functions.invoke(functionName, { body: { candidateId: c.id } })
          .then(() => { processed++; updateJob(jobId, { processed }); })
          .catch(() => { processed++; updateJob(jobId, { processed }); })
      );
      await Promise.all(promises);
    }

    updateJob(jobId, { status: 'done', processed });
  };

  const runAll = async () => {
    setIsRunning(true);
    toast.info('Starting batch processing pipeline...');

    try {
      await runBatchJob('enrich', 'enrich-candidate-profile');
      await runBatchJob('autotag', 'auto-tag-candidate');
      await runBatchJob('embedding', 'generate-candidate-embedding');
      toast.success('Batch processing complete.');
    } catch (e) {
      toast.error('Batch processing encountered errors.');
    } finally {
      setIsRunning(false);
    }
  };

  const runSingle = async (jobId: string) => {
    setIsRunning(true);
    const fnMap: Record<string, string> = {
      enrich: 'enrich-candidate-profile',
      autotag: 'auto-tag-candidate',
      embedding: 'generate-candidate-embedding',
    };
    await runBatchJob(jobId, fnMap[jobId]);
    setIsRunning(false);
    toast.success(`${jobs.find(j => j.id === jobId)?.label} complete.`);
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Batch AI Processing
          </CardTitle>
          <Button
            size="sm"
            onClick={runAll}
            disabled={isRunning}
            className="text-xs"
          >
            {isRunning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
            Run All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {jobs.map(job => (
          <div key={job.id} className="space-y-1.5 p-2 rounded-lg border border-border/20 bg-background/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {job.icon}
                <span className="text-xs font-medium">{job.label}</span>
                {job.status === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                {job.status === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
                {job.status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                disabled={isRunning}
                onClick={() => runSingle(job.id)}
              >
                Run
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">{job.description}</p>
            {job.status === 'running' && (
              <div className="space-y-1">
                <Progress value={job.total > 0 ? (job.processed / job.total) * 100 : 0} className="h-1" />
                <p className="text-[10px] text-muted-foreground text-right">{job.processed}/{job.total}</p>
              </div>
            )}
            {job.status === 'done' && (
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                {job.processed} processed
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
