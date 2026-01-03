import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Play, 
  FileStack, 
  Calculator, 
  Gift,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BackfillResult {
  success: boolean;
  created?: number;
  skipped?: number;
  errors?: number;
  message?: string;
}

interface BackfillJob {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  functionName: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  result?: BackfillResult;
}

export function BackfillRunner() {
  const [dryRun, setDryRun] = useState(true);
  const [jobs, setJobs] = useState<BackfillJob[]>([
    {
      id: 'placement-fees',
      name: 'Placement Fees',
      description: 'Create placement fees for hired applications without fees',
      icon: <FileStack className="h-5 w-5" />,
      functionName: 'backfill-placement-fees',
      status: 'idle',
    },
    {
      id: 'commissions',
      name: 'Commissions',
      description: 'Calculate commissions for placement fees without commission records',
      icon: <Calculator className="h-5 w-5" />,
      functionName: 'calculate-recruiter-commissions',
      status: 'idle',
    },
    {
      id: 'referral-payouts',
      name: 'Referral Payouts',
      description: 'Create referral payouts for hired referred candidates',
      icon: <Gift className="h-5 w-5" />,
      functionName: 'process-referral-payouts',
      status: 'idle',
    },
  ]);

  const runBackfillMutation = useMutation({
    mutationFn: async (job: BackfillJob) => {
      const { data, error } = await supabase.functions.invoke(job.functionName, {
        body: { dryRun },
      });
      if (error) throw error;
      return data as BackfillResult;
    },
    onMutate: (job) => {
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'running' as const } : j
      ));
    },
    onSuccess: (result, job) => {
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'completed' as const, result } : j
      ));
      toast.success(`${job.name} backfill completed`);
    },
    onError: (error, job) => {
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { 
          ...j, 
          status: 'error' as const, 
          result: { success: false, message: (error as Error).message } 
        } : j
      ));
      toast.error(`${job.name} backfill failed: ${(error as Error).message}`);
    },
  });

  const runAllBackfills = async () => {
    for (const job of jobs) {
      if (job.status !== 'running') {
        await runBackfillMutation.mutateAsync(job);
      }
    }
  };

  const getStatusBadge = (job: BackfillJob) => {
    switch (job.status) {
      case 'running':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const progress = (completedJobs / jobs.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Backfill Runner
            </CardTitle>
            <CardDescription>
              Populate missing financial data from historical records
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="dry-run"
                checked={dryRun}
                onCheckedChange={setDryRun}
              />
              <Label htmlFor="dry-run" className="text-sm">
                {dryRun ? 'Dry Run (Preview Only)' : 'Live Mode'}
              </Label>
            </div>
            <Button 
              onClick={runAllBackfills}
              disabled={runBackfillMutation.isPending}
            >
              {runBackfillMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        {completedJobs > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{completedJobs} / {jobs.length} completed</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-background">
                      {job.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{job.name}</h4>
                      <p className="text-sm text-muted-foreground">{job.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(job)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runBackfillMutation.mutate(job)}
                      disabled={job.status === 'running' || runBackfillMutation.isPending}
                    >
                      {job.status === 'running' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Results */}
                {job.result && (
                  <div className="mt-4 pt-4 border-t">
                    {job.result.success ? (
                      <div className="flex gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Created:</span>{' '}
                          <span className="font-medium text-green-500">{job.result.created || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Skipped:</span>{' '}
                          <span className="font-medium">{job.result.skipped || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Errors:</span>{' '}
                          <span className="font-medium text-destructive">{job.result.errors || 0}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-destructive">{job.result.message}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Warning */}
        {!dryRun && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-500">Live Mode Active</h4>
                <p className="text-sm text-muted-foreground">
                  Running backfills in live mode will create actual records in the database.
                  Consider running in dry-run mode first to preview changes.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
