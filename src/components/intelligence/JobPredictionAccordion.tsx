import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, AlertTriangle, Briefcase, Infinity } from "lucide-react";
import { PredictiveAnalyticsDashboard } from "./PredictiveAnalyticsDashboard";
import { cn } from "@/lib/utils";

interface JobHealthScore {
  jobId: string;
  title: string;
  score: number;
  appCount: number;
}

interface Job {
  id: string;
  title: string;
  status: string;
  companies?: { name: string };
  is_continuous?: boolean;
  hired_count?: number;
  target_hire_count?: number | null;
}

interface JobPredictionAccordionProps {
  jobs: Job[];
  jobHealthScores: JobHealthScore[];
}

function getHealthColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getHealthLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Attention';
}

export function JobPredictionAccordion({ jobs, jobHealthScores }: JobPredictionAccordionProps) {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const toggleJob = (jobId: string) => {
    setExpandedJobId(prev => prev === jobId ? null : jobId);
  };

  // Sort jobs by health score (lowest first for attention)
  const sortedJobs = [...jobs].sort((a, b) => {
    const scoreA = jobHealthScores.find(j => j.jobId === a.id)?.score || 0;
    const scoreB = jobHealthScores.find(j => j.jobId === b.id)?.score || 0;
    return scoreA - scoreB;
  });

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Jobs</h3>
          <p className="text-sm text-muted-foreground">
            Publish jobs to see AI-powered predictions for each role.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Individual Job Predictions</h3>
        <p className="text-sm text-muted-foreground">Click to expand</p>
      </div>

      {sortedJobs.map(job => {
        const healthData = jobHealthScores.find(j => j.jobId === job.id);
        const score = healthData?.score || 0;
        const isExpanded = expandedJobId === job.id;
        const needsAttention = score < 50;

        return (
          <Card 
            key={job.id}
            className={cn(
              "transition-all duration-200",
              needsAttention && "border-amber-500/30",
              isExpanded && "ring-1 ring-primary/20"
            )}
          >
            <CardHeader 
              className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
              onClick={() => toggleJob(job.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="p-0 h-auto">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </Button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{job.title}</h4>
                      {job.is_continuous && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                          <Infinity className="h-3 w-3 mr-1" />
                          Continuous
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{job.companies?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {needsAttention && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", getHealthColor(score))} />
                    <span className="text-sm font-medium">{score}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {getHealthLabel(score)}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {healthData?.appCount || 0} candidates
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 border-t">
                <div className="pt-4">
                  <PredictiveAnalyticsDashboard jobId={job.id} />
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
