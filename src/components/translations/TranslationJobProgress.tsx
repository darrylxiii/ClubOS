import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranslationJob {
  id: string;
  namespace: string;
  target_languages: string[];
  status: string;
  progress_percentage: number;
  completed_languages: string[] | null;
  failed_languages: string[] | null;
  error_message: string | null;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface TranslationJobProgressProps {
  onJobComplete?: () => void;
  onCleanup?: () => void;
}

export function TranslationJobProgress({ onJobComplete, onCleanup }: TranslationJobProgressProps) {
  const [jobs, setJobs] = useState<TranslationJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch current jobs
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from('translation_generation_jobs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setJobs(data as TranslationJob[]);
      }
      setIsLoading(false);
    };

    fetchJobs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('translation-jobs-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translation_generation_jobs',
        },
        (payload) => {
          console.log('[TranslationJobProgress] Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setJobs(prev => [payload.new as TranslationJob, ...prev.slice(0, 4)]);
          } else if (payload.eventType === 'UPDATE') {
            setJobs(prev => prev.map(job => 
              job.id === payload.new.id ? payload.new as TranslationJob : job
            ));
            
            // Notify on completion
            const newJob = payload.new as TranslationJob;
            if (newJob.status === 'completed' || newJob.status === 'partial') {
              onJobComplete?.();
            }
          } else if (payload.eventType === 'DELETE') {
            setJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onJobComplete]);

  const runningJobs = jobs.filter(j => j.status === 'running');
  const recentJobs = jobs.filter(j => j.status !== 'running').slice(0, 3);

  if (isLoading) {
    return null;
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Running Jobs */}
      {runningJobs.map(job => (
        <RunningJobCard key={job.id} job={job} />
      ))}

      {/* Recent Jobs */}
      {recentJobs.length > 0 && runningJobs.length === 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Recent Jobs</h4>
            {onCleanup && (
              <Button variant="ghost" size="sm" onClick={onCleanup} className="h-7 text-xs">
                <Trash2 className="h-3 w-3 mr-1" /> Clear History
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {recentJobs.map(job => (
              <CompletedJobRow key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RunningJobCard({ job }: { job: TranslationJob }) {
  const [now, setNow] = useState(Date.now());
  const completedCount = job.completed_languages?.length || 0;
  const totalCount = job.target_languages?.length || 7;
  const namespaces = job.namespace.split(',');
  const totalTranslations = namespaces.length * totalCount;
  const progress = totalTranslations > 0 ? (completedCount / totalTranslations) * 100 : 0;
  
  const elapsed = Math.floor((now - new Date(job.started_at).getTime()) / 1000);
  const lastUpdateTime = job.updated_at || job.started_at;
  const lastUpdate = Math.floor((now - new Date(lastUpdateTime).getTime()) / 1000);
  const isStale = lastUpdate > 5 * 60; // 5 minutes without update = stale
  
  // Calculate ETA based on time since last update and progress rate
  const timeSinceLastUpdate = lastUpdate;
  const progressRate = job.progress_percentage > 0 ? elapsed / job.progress_percentage : 0;
  const estimatedRemaining = job.progress_percentage > 0 && progressRate > 0 
    ? Math.floor(progressRate * (100 - job.progress_percentage))
    : null;

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn(
      "rounded-lg border bg-card p-4",
      isStale ? "border-yellow-500 bg-yellow-500/5" : "animate-pulse-slow"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isStale ? (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span className="font-medium text-sm">
            {isStale ? 'Job May Be Stuck' : 'Generating Translations'}
          </span>
          {isStale && (
            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500">
              No updates for {formatDuration(lastUpdate)}
            </Badge>
          )}
        </div>
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {formatDuration(elapsed)}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {namespaces.length} namespace{namespaces.length > 1 ? 's' : ''} × {totalCount} languages
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{completedCount} / {totalTranslations} completed</span>
          {estimatedRemaining && estimatedRemaining > 0 && (
            <span>~{formatDuration(estimatedRemaining)} remaining</span>
          )}
        </div>

        {job.completed_languages && job.completed_languages.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {job.completed_languages.slice(-5).map(lang => (
              <Badge key={lang} variant="secondary" className="text-xs h-5">
                <CheckCircle className="h-2 w-2 mr-1" />
                {lang}
              </Badge>
            ))}
            {job.completed_languages.length > 5 && (
              <Badge variant="outline" className="text-xs h-5">
                +{job.completed_languages.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CompletedJobRow({ job }: { job: TranslationJob }) {
  const StatusIcon = job.status === 'completed' ? CheckCircle 
    : job.status === 'partial' ? AlertTriangle 
    : XCircle;
  
  const statusColor = job.status === 'completed' ? 'text-green-600' 
    : job.status === 'partial' ? 'text-yellow-600' 
    : 'text-destructive';

  const completedAt = job.completed_at ? new Date(job.completed_at) : null;
  const namespaces = job.namespace.split(',');

  return (
    <div className={cn(
      'flex items-center justify-between p-2 rounded-md',
      job.status === 'failed' && 'bg-destructive/5',
      job.status === 'partial' && 'bg-yellow-500/5',
      job.status === 'completed' && 'bg-green-500/5'
    )}>
      <div className="flex items-center gap-2">
        <StatusIcon className={cn('h-4 w-4', statusColor)} />
        <div>
          <span className="text-sm font-medium">
            {namespaces.length > 3 ? `${namespaces.length} namespaces` : namespaces.join(', ')}
          </span>
          {job.error_message && (
            <p className="text-xs text-destructive">{job.error_message}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <Badge variant={job.status === 'completed' ? 'default' : job.status === 'partial' ? 'outline' : 'destructive'} className="text-xs">
          {job.status}
        </Badge>
        {completedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            {completedAt.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
