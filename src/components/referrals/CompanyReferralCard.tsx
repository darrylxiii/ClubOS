import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Building2, ChevronDown, ChevronUp, Euro, Users, Briefcase } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { ReferralPolicy, ReferralEarning, useCompanyJobs } from "@/hooks/useReferralSystem";
import { motion, AnimatePresence } from "framer-motion";
import { JobReferralCard } from "./JobReferralCard";

interface CompanyReferralCardProps {
  policy: ReferralPolicy;
  earnings: ReferralEarning[];
}

export function CompanyReferralCard({ policy, earnings }: CompanyReferralCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: jobs = [] } = useCompanyJobs(policy.company_id);

  const companyEarnings = earnings.filter(e => e.company_id === policy.company_id);
  const totalExpectedRevenue = companyEarnings.reduce((sum, e) => sum + (e.placement_fee_total || 0), 0);
  const projectedEarnings = companyEarnings.reduce((sum, e) => sum + (e.weighted_amount || 0), 0);
  const totalCandidates = companyEarnings.length;

  // Group candidates by stage
  const stageBreakdown = companyEarnings.reduce((acc, e) => {
    const stageName = e.application?.status || 'applied';
    acc[stageName] = (acc[stageName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="glass-card hover:shadow-xl transition-all duration-300">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{policy.company?.name || 'Unknown Company'}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {jobs.length} active job{jobs.length !== 1 ? 's' : ''} • Claimed {new Date(policy.claimed_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-success border-success/30">
                {policy.share_percentage}% share
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 py-4 border-b border-border/50">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Euro className="h-3 w-3" />
                <span className="text-xs">Expected Revenue</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(totalExpectedRevenue)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Euro className="h-3 w-3" />
                <span className="text-xs">Your Projected</span>
              </div>
              <p className="text-lg font-bold text-success">{formatCurrency(projectedEarnings)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Users className="h-3 w-3" />
                <span className="text-xs">Candidates</span>
              </div>
              <p className="text-lg font-bold">{totalCandidates}</p>
            </div>
          </div>

          {/* Stage Breakdown */}
          {Object.keys(stageBreakdown).length > 0 && (
            <div className="py-4 border-b border-border/50">
              <p className="text-xs text-muted-foreground mb-2">Pipeline Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stageBreakdown).map(([stage, count]) => (
                  <Badge key={stage} variant="secondary" className="capitalize">
                    {stage}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Expandable Jobs List */}
          <CollapsibleContent>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-4 space-y-3"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Jobs from {policy.company?.name}</h4>
                  </div>
                  {jobs.length > 0 ? (
                    jobs.map((job: any) => (
                      <JobReferralCard
                        key={job.id}
                        job={{
                          ...job,
                          salary_min: job.salary_min ?? undefined,
                          salary_max: job.salary_max ?? undefined,
                          status: job.status ?? undefined,
                          created_at: job.created_at ?? undefined,
                        }}
                        earnings={companyEarnings.filter(e => e.job_id === job.id)}
                        sharePercentage={policy.share_percentage}
                        compact
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No active jobs yet. New jobs will be automatically tracked.
                    </p>
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
