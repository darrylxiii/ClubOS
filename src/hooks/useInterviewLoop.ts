import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InterviewRound {
  name: string;
  interviewerIds: string[];
  durationMinutes: number;
  scorecardTemplate?: string;
}

interface InterviewLoopData {
  rounds: InterviewRound[];
  completedRoundsMap: Record<string, number>; // applicationId -> completed count
}

export function useInterviewLoop(jobId: string, applicationIds: string[]) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['interview-loop', jobId],
    queryFn: async (): Promise<InterviewLoopData> => {
      // Fetch job interview config
      const { data: job } = await supabase
        .from('jobs')
        .select('interview_loop_config')
        .eq('id', jobId)
        .single();

      const rounds: InterviewRound[] = (job as any)?.interview_loop_config || [];

      // Batch fetch scorecard counts per application
      const completedRoundsMap: Record<string, number> = {};

      if (applicationIds.length > 0) {
        const { data: scorecards } = await (supabase as any)
          .from('candidate_scorecards')
          .select('application_id')
          .in('application_id', applicationIds);

        const counts = new Map<string, number>();
        for (const sc of (scorecards || [])) {
          counts.set(sc.application_id, (counts.get(sc.application_id) || 0) + 1);
        }
        counts.forEach((count, appId) => {
          completedRoundsMap[appId] = count;
        });
      }

      return { rounds, completedRoundsMap };
    },
    staleTime: 30_000,
  });

  const updateConfig = useMutation({
    mutationFn: async (rounds: InterviewRound[]) => {
      const { error } = await supabase
        .from('jobs')
        .update({ interview_loop_config: rounds } as any)
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-loop', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job-dashboard', jobId] });
    },
  });

  return {
    rounds: query.data?.rounds || [],
    completedRoundsMap: query.data?.completedRoundsMap || {},
    isLoading: query.isLoading,
    updateConfig,
    getNextRound: (appId: string) => {
      const completed = query.data?.completedRoundsMap[appId] || 0;
      const rounds = query.data?.rounds || [];
      return completed < rounds.length ? rounds[completed] : null;
    },
  };
}
