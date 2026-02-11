import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StageMetrics {
  stage: string;
  avgDays: number;
  count: number;
}

interface PipelineVelocity {
  avgTimeToShortlist: number;
  avgTimeToOffer: number;
  avgTimeToHire: number;
  shortlistSLACompliance: number;
  stageMetrics: StageMetrics[];
  overdueCount: number;
  bottleneckStage: string | null;
  trend: number;
}

const SHORTLIST_SLA_HOURS = 48; // 24-48 hours SLA

export function usePipelineVelocity() {
  return useQuery({
    queryKey: ['pipeline-velocity'],
    queryFn: async (): Promise<PipelineVelocity> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get applications with stage progression data
      const { data: applications, error } = await supabase
        .from('applications')
        .select('id, status, stages, applied_at, updated_at, current_stage_index')
        .gte('applied_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      // Calculate stage timing from stages JSON
      const stageTimes: Record<string, number[]> = {
        applied: [],
        screening: [],
        interview: [],
        offer: [],
        hired: [],
      };

      let shortlistWithinSLA = 0;
      let totalShortlisted = 0;
      let overdueCount = 0;

      applications?.forEach(app => {
        const stages = app.stages as Array<{ name?: string; timestamp?: string }>;
        if (!stages || !Array.isArray(stages)) return;

        // Calculate time in each stage
        for (let i = 0; i < stages.length - 1; i++) {
          const currentStage = stages[i];
          const nextStage = stages[i + 1];
          
          if (currentStage?.timestamp && nextStage?.timestamp) {
            const duration = new Date(nextStage.timestamp).getTime() - new Date(currentStage.timestamp).getTime();
            const daysInStage = duration / (1000 * 60 * 60 * 24);
            
            if (currentStage.name && stageTimes[currentStage.name]) {
              stageTimes[currentStage.name].push(daysInStage);
            }
          }
        }

        // Check SLA compliance for screening stage
        const screeningStage = stages.find(s => s.name === 'screening');
        if (screeningStage?.timestamp) {
          totalShortlisted++;
          const appliedTime = new Date(app.applied_at).getTime();
          const screeningTime = new Date(screeningStage.timestamp).getTime();
          const hoursToShortlist = (screeningTime - appliedTime) / (1000 * 60 * 60);
          
          if (hoursToShortlist <= SHORTLIST_SLA_HOURS) {
            shortlistWithinSLA++;
          }
        }

        // Check for overdue (in pipeline > 30 days without movement)
        if (['applied', 'screening', 'interview'].includes(app.status)) {
          const lastUpdate = new Date(app.updated_at).getTime();
          const daysSinceUpdate = (now.getTime() - lastUpdate) / (1000 * 60 * 60 * 24);
          if (daysSinceUpdate > 7) {
            overdueCount++;
          }
        }
      });

      // Calculate averages
      const calculateAvg = (times: number[]) => 
        times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

      const stageMetrics: StageMetrics[] = Object.entries(stageTimes).map(([stage, times]) => ({
        stage,
        avgDays: Math.round(calculateAvg(times) * 10) / 10,
        count: times.length,
      }));

      // Find bottleneck (longest average time)
      const bottleneckStage = stageMetrics
        .filter(s => s.count > 0)
        .sort((a, b) => b.avgDays - a.avgDays)[0]?.stage || null;

      // Calculate total times
      const avgTimeToShortlist = calculateAvg(stageTimes.applied);
      const avgTimeToOffer = avgTimeToShortlist + calculateAvg(stageTimes.screening) + calculateAvg(stageTimes.interview);
      const avgTimeToHire = avgTimeToOffer + calculateAvg(stageTimes.offer);

      const shortlistSLACompliance = totalShortlisted > 0 
        ? (shortlistWithinSLA / totalShortlisted) * 100 
        : 100;

      return {
        avgTimeToShortlist: Math.round(avgTimeToShortlist * 10) / 10,
        avgTimeToOffer: Math.round(avgTimeToOffer * 10) / 10,
        avgTimeToHire: Math.round(avgTimeToHire * 10) / 10,
        shortlistSLACompliance: Math.round(shortlistSLACompliance),
        stageMetrics,
        overdueCount,
        bottleneckStage,
        trend: 0, // Would need historical comparison
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
