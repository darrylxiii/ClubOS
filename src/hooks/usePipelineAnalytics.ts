import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RecruiterActivity {
  userId: string;
  name: string;
  avatarUrl: string | null;
  stageChanges: number;
  interviews: number;
  messages: number;
  total: number;
}

interface SourceBreakdown {
  source: string;
  count: number;
}

export interface PipelineAnalyticsData {
  recruiterActivity: RecruiterActivity[];
  sourceBreakdown: SourceBreakdown[];
}

export function usePipelineAnalytics(jobId: string) {
  return useQuery({
    queryKey: ['pipeline-analytics', jobId],
    queryFn: async (): Promise<PipelineAnalyticsData> => {
      // Fetch pipeline events with performer profiles
      const { data: events } = await (supabase as any)
        .from('pipeline_events')
        .select('event_type, performed_by, profiles!pipeline_events_performed_by_fkey(full_name, avatar_url)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(500);

      // Fetch applications for source breakdown
      const { data: apps } = await supabase
        .from('applications')
        .select('application_source')
        .eq('job_id', jobId);

      // Build recruiter activity map
      const recruiterMap = new Map<string, RecruiterActivity>();

      for (const event of (events || [])) {
        const uid = event.performed_by;
        if (!uid) continue;

        if (!recruiterMap.has(uid)) {
          const profile = event.profiles;
          recruiterMap.set(uid, {
            userId: uid,
            name: profile?.full_name || 'Unknown',
            avatarUrl: profile?.avatar_url || null,
            stageChanges: 0,
            interviews: 0,
            messages: 0,
            total: 0,
          });
        }

        const entry = recruiterMap.get(uid)!;
        entry.total++;

        switch (event.event_type) {
          case 'stage_change':
          case 'status_change':
            entry.stageChanges++;
            break;
          case 'interview_scheduled':
          case 'feedback_added':
            entry.interviews++;
            break;
          case 'message_sent':
            entry.messages++;
            break;
        }
      }

      const recruiterActivity = Array.from(recruiterMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Build source breakdown
      const sourceMap = new Map<string, number>();
      for (const app of (apps || [])) {
        const src = (app as any).application_source || 'Direct';
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
      }

      const sourceBreakdown = Array.from(sourceMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      return { recruiterActivity, sourceBreakdown };
    },
    staleTime: 60_000,
  });
}
