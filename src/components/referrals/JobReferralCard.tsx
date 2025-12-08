import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Briefcase, ChevronDown, ChevronUp, Euro, Users, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { ReferralEarning, useJobApplications } from "@/hooks/useReferralSystem";
import { motion, AnimatePresence } from "framer-motion";

interface JobReferralCardProps {
  job: {
    id: string;
    title: string;
    salary_min?: number;
    salary_max?: number;
    status?: string;
    created_at?: string;
  };
  earnings: ReferralEarning[];
  sharePercentage: number;
  compact?: boolean;
}

export function JobReferralCard({ job, earnings, sharePercentage, compact = false }: JobReferralCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: applications = [] } = useJobApplications(job.id);

  const avgSalary = job.salary_max || job.salary_min || 75000;
  const expectedFee = avgSalary * 0.2; // Assuming 20% fee
  const projectedEarnings = expectedFee * (sharePercentage / 100);

  // Calculate stage breakdown from applications
  const stageBreakdown = applications.reduce((acc, app) => {
    const stage = app.status || 'applied';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalCandidates = applications.length;
  const progressPercentage = Math.min(100, (totalCandidates / 5) * 100); // Assuming 5 candidates is full

  if (compact) {
    return (
      <div className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate">{job.title}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {totalCandidates}
            </Badge>
            <span className="text-sm font-medium text-success">
              {formatCurrency(projectedEarnings)}
            </span>
          </div>
        </div>
        {Object.keys(stageBreakdown).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pl-6">
            {Object.entries(stageBreakdown).map(([stage, count]) => (
              <Badge key={stage} variant="outline" className="text-xs capitalize">
                {stage}: {count}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="glass-card hover:shadow-lg transition-all duration-300">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-info/10">
                <Briefcase className="h-4 w-4 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{job.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {job.salary_min && job.salary_max 
                    ? `${formatCurrency(job.salary_min)} - ${formatCurrency(job.salary_max)}`
                    : 'Salary not specified'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-lg font-bold text-success">{formatCurrency(projectedEarnings)}</p>
                <p className="text-xs text-muted-foreground">projected</p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Expected Fee</p>
              <p className="font-medium">{formatCurrency(expectedFee)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Your Share</p>
              <p className="font-medium">{sharePercentage}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Candidates</p>
              <p className="font-medium">{totalCandidates}</p>
            </div>
          </div>

          {/* Pipeline Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Pipeline Fill</span>
              <span>{totalCandidates}/5 candidates</span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>

          {/* Expandable Details */}
          <CollapsibleContent>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-border/50"
                >
                  <h5 className="text-sm font-medium mb-2">Pipeline Breakdown</h5>
                  {Object.keys(stageBreakdown).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(stageBreakdown).map(([stage, count]) => (
                        <div key={stage} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{stage}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No candidates in pipeline yet</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
