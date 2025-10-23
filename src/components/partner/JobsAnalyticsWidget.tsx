import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Clock, TrendingUp, Users } from "lucide-react";
import { calculateFillRate, calculateAvgDaysOpen, getDaysOpenColor } from "@/lib/jobUtils";

interface JobsAnalyticsWidgetProps {
  jobs: any[];
  totalCandidates: number;
}

export const JobsAnalyticsWidget = memo(({ jobs, totalCandidates }: JobsAnalyticsWidgetProps) => {
  const openJobs = jobs.filter(j => j.status === 'published').length;
  const avgDaysOpen = calculateAvgDaysOpen(jobs);
  const fillRate = calculateFillRate(jobs);
  const candidatePipeline = jobs.reduce((sum, job) => sum + job.active_stage_count, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Open Jobs */}
      <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:border-border/40 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-card/40">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{openJobs}</p>
              <p className="text-sm text-muted-foreground">Open Jobs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avg Days Open */}
      <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:border-border/40 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-card/40">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`text-2xl font-black ${getDaysOpenColor(avgDaysOpen)}`}>
                {avgDaysOpen}d
              </p>
              <p className="text-sm text-muted-foreground">Avg Days Open</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fill Rate */}
      <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:border-border/40 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-card/40">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{fillRate}%</p>
              <p className="text-sm text-muted-foreground">Fill Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Pipeline */}
      <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:border-border/40 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-card/40">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{candidatePipeline}</p>
              <p className="text-sm text-muted-foreground">Active Pipeline</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

JobsAnalyticsWidget.displayName = 'JobsAnalyticsWidget';
