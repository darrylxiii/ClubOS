import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Briefcase, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Euro
} from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { useReferralEarnings, ReferralEarning } from "@/hooks/useReferralSystem";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TrackedJob {
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: string;
  earnings: ReferralEarning[];
  totalProjected: number;
  totalWeighted: number;
  candidates: number;
  stageBreakdown: Record<string, number>;
}

const STAGE_PROBABILITIES: Record<string, number> = {
  'applied': 10,
  'screening': 25,
  'interview': 50,
  'final': 75,
  'offer': 90,
  'hired': 100,
};

const STAGE_COLORS: Record<string, string> = {
  'applied': 'bg-muted',
  'screening': 'bg-info/50',
  'interview': 'bg-warning/50',
  'final': 'bg-accent/50',
  'offer': 'bg-success/50',
  'hired': 'bg-success',
};

export function ReferralJobTracker() {
  const { data: earnings, isLoading } = useReferralEarnings();
  const [trackedJobs, setTrackedJobs] = useState<TrackedJob[]>([]);

  useEffect(() => {
    if (!earnings) return;

    // Group earnings by job
    const jobMap = new Map<string, TrackedJob>();

    earnings.forEach(earning => {
      if (!earning.job_id || !earning.job) return;

      const existing = jobMap.get(earning.job_id);
      if (existing) {
        existing.earnings.push(earning);
        existing.totalProjected += earning.projected_amount || 0;
        existing.totalWeighted += earning.weighted_amount || 0;
        existing.candidates += 1;

        const stage = earning.application?.status || 'applied';
        existing.stageBreakdown[stage] = (existing.stageBreakdown[stage] || 0) + 1;
      } else {
        const stage = earning.application?.status || 'applied';
        jobMap.set(earning.job_id, {
          jobId: earning.job_id,
          jobTitle: earning.job.title,
          companyName: earning.company?.name || 'Unknown',
          status: earning.status,
          earnings: [earning],
          totalProjected: earning.projected_amount || 0,
          totalWeighted: earning.weighted_amount || 0,
          candidates: 1,
          stageBreakdown: { [stage]: 1 },
        });
      }
    });

    setTrackedJobs(Array.from(jobMap.values()));
  }, [earnings]);

  // Set up realtime subscription for earnings updates
  useEffect(() => {
    const channel = supabase
      .channel('referral-earnings-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_earnings',
        },
        (payload) => {
          console.log('[ReferralJobTracker] Realtime update:', payload);
          // Refetch will be handled by react-query invalidation
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (trackedJobs.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Active Referrals</h3>
          <p className="text-muted-foreground max-w-md">
            Start referring candidates to jobs to track your earnings here in real-time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {trackedJobs.map((job, index) => (
          <motion.div
            key={job.jobId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.1 }}
          >
            <TrackedJobCard job={job} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function TrackedJobCard({ job }: { job: TrackedJob }) {
  const stages = ['applied', 'screening', 'interview', 'final', 'offer', 'hired'];
  const maxStageReached = stages.findIndex(s => 
    Object.keys(job.stageBreakdown).includes(s)
  );
  const highestStage = stages.reduce((highest, stage) => {
    if (job.stageBreakdown[stage]) return stage;
    return highest;
  }, 'applied');

  const probability = STAGE_PROBABILITIES[highestStage] || 10;
  const progressValue = (stages.indexOf(highestStage) / (stages.length - 1)) * 100;

  return (
    <Card className="glass-card hover:shadow-lg transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-info/10">
              <Briefcase className="h-5 w-5 text-info" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">{job.jobTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">{job.companyName}</p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-success">
              {formatCurrency(job.totalWeighted)}
            </p>
            <p className="text-xs text-muted-foreground">weighted earnings</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pipeline Visualization */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pipeline Progress</span>
            <span className="font-medium text-foreground">{probability}% probability</span>
          </div>
          <div className="relative">
            <Progress value={progressValue} className="h-2" />
            <div className="flex justify-between mt-1">
              {stages.map((stage, i) => {
                const count = job.stageBreakdown[stage] || 0;
                const isActive = count > 0;
                return (
                  <div 
                    key={stage}
                    className={cn(
                      "flex flex-col items-center",
                      isActive ? "text-foreground" : "text-muted-foreground/50"
                    )}
                  >
                    <div 
                      className={cn(
                        "w-2 h-2 rounded-full -mt-1.5",
                        isActive ? STAGE_COLORS[stage] : "bg-muted"
                      )}
                    />
                    {count > 0 && (
                      <span className="text-[10px] mt-0.5 font-medium">{count}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Applied</span>
            <span>Hired</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 pt-2 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
            </div>
            <p className="text-lg font-bold">{job.candidates}</p>
            <p className="text-[10px] text-muted-foreground">Candidates</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
            </div>
            <p className="text-lg font-bold">{probability}%</p>
            <p className="text-[10px] text-muted-foreground">Probability</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Euro className="h-3 w-3" />
            </div>
            <p className="text-lg font-bold">{formatCurrency(job.totalProjected)}</p>
            <p className="text-[10px] text-muted-foreground">Projected</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success mb-1">
              <CheckCircle className="h-3 w-3" />
            </div>
            <p className="text-lg font-bold text-success">{formatCurrency(job.totalWeighted)}</p>
            <p className="text-[10px] text-muted-foreground">Weighted</p>
          </div>
        </div>

        {/* Stage Breakdown Pills */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {stages.map(stage => {
            const count = job.stageBreakdown[stage] || 0;
            if (count === 0) return null;
            return (
              <Badge 
                key={stage}
                variant="outline" 
                className={cn(
                  "text-xs capitalize",
                  STAGE_COLORS[stage]
                )}
              >
                {stage}: {count}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
