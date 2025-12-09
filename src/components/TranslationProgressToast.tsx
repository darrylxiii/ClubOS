import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranslationJob {
  id: string;
  namespace: string;
  target_languages: string[];
  status: string;
  progress_percentage?: number;
  completed_languages: string[];
  failed_languages: string[];
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface TranslationProgressToastProps {
  jobId: string;
  onComplete?: () => void;
}

export const TranslationProgressToast: React.FC<TranslationProgressToastProps> = ({
  jobId,
  onComplete
}) => {
  const [job, setJob] = useState<TranslationJob | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      const { data } = await supabase
        .from('translation_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (data) {
        setJob(data as unknown as TranslationJob);
      }
    };

    fetchJob();

    const channel = supabase
      .channel(`translation-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'translation_generation_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const newJob = payload.new as unknown as TranslationJob;
          setJob(newJob);
          
          if (newJob.status === 'completed' || newJob.status === 'failed') {
            onComplete?.();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, onComplete]);

  if (!job) return null;

  const completedCount = job.completed_languages?.length || 0;
  const totalCount = job.target_languages?.length || 7;
  const namespaces = job.namespace?.split(',') || [];
  const totalTranslations = namespaces.length * totalCount;
  const progress = totalTranslations > 0 
    ? Math.round((completedCount / totalTranslations) * 100)
    : 0;

  const statusIcon = {
    running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-destructive" />,
    partial: <CheckCircle className="h-4 w-4 text-yellow-500" />,
    rate_limited: <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
  };

  const statusText = {
    running: 'Generating translations...',
    completed: 'All translations complete!',
    failed: 'Translation failed',
    partial: 'Partial completion',
    rate_limited: 'Rate limited, retrying...'
  };

  return (
    <div className="w-80 p-4 bg-card border rounded-lg shadow-lg space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        <span className="font-medium">Translation Progress</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {statusIcon[job.status as keyof typeof statusIcon] || statusIcon.running}
            <span className={cn(
              job.status === 'completed' && 'text-green-500',
              job.status === 'failed' && 'text-destructive'
            )}>
              {statusText[job.status as keyof typeof statusText] || job.status}
            </span>
          </div>
          <span className="text-muted-foreground">{progress}%</span>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="text-xs text-muted-foreground">
          {completedCount} of {totalTranslations} translations completed
        </div>

        {job.error_message && (
          <div className="text-xs text-destructive mt-2">
            {job.error_message}
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationProgressToast;
