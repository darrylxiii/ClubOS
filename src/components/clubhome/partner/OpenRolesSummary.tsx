import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Clock, ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays } from "date-fns";
import { RainbowButton } from "@/components/ui/rainbow-button";

interface RoleSummary {
  id: string;
  title: string;
  status: string;
  created_at: string;
  candidateCount: number;
  furthestStage: string;
  daysOpen: number;
}

interface OpenRolesSummaryProps {
  companyId: string;
}

export function OpenRolesSummary({ companyId }: OpenRolesSummaryProps) {
  const { t } = useTranslation('common');
  const { data: roles, isLoading } = useQuery({
    queryKey: ['open-roles-summary', companyId],
    queryFn: async (): Promise<RoleSummary[]> => {
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, status, created_at')
        .eq('company_id', companyId)
        .in('status', ['published', 'active', 'open'])
        .order('created_at', { ascending: false })
        .limit(6);

      if (jobsError || !jobs?.length) return [];

      const jobIds = jobs.map(j => j.id);

      const { data: applications } = await supabase
        .from('applications')
        .select('job_id, current_stage_index, stages')
        .in('job_id', jobIds)
        .neq('status', 'rejected')
        .neq('status', 'withdrawn');

      const appsByJob = (applications || []).reduce((acc, app) => {
        if (!acc[app.job_id]) acc[app.job_id] = [];
        acc[app.job_id].push(app);
        return acc;
      }, {} as Record<string, typeof applications>);

      return jobs.map(job => {
        const jobApps = appsByJob[job.id] || [];
        let furthestStage = 'No applicants';

        if (jobApps.length > 0) {
          const maxStageIndex = Math.max(...jobApps.map(a => a.current_stage_index || 0));
          const appWithMax = jobApps.find(a => a.current_stage_index === maxStageIndex);
          if (appWithMax) {
            try {
              const stages = Array.isArray(appWithMax.stages)
                ? appWithMax.stages
                : JSON.parse(appWithMax.stages as any);
              furthestStage = stages[maxStageIndex]?.name || `Stage ${maxStageIndex + 1}`;
            } catch {
              furthestStage = `Stage ${maxStageIndex + 1}`;
            }
          }
        }

        return {
          id: job.id,
          title: job.title,
          status: job.status,
          created_at: job.created_at,
          candidateCount: jobApps.length,
          furthestStage,
          daysOpen: differenceInDays(new Date(), new Date(job.created_at)),
        };
      });
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4 text-primary" />
            Open Roles
          </CardTitle>
          <Button variant="default" size="sm" asChild>
            <Link to="/company-jobs/new">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Role
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!roles || roles.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium mb-1">{t("no_open_roles_yet", "No open roles yet")}</p>
            <p className="text-xs text-muted-foreground mb-4">
              Partners typically receive their first shortlist within 48 hours
            </p>
            <Link to="/company-jobs/new">
              <RainbowButton className="h-10 px-6 text-sm">
                <Plus className="h-4 w-4 mr-2" />
                Post a Role — get candidates in 48h
              </RainbowButton>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {roles.map(role => (
              <Link
                key={role.id}
                to={`/company-jobs/${role.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {role.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {role.candidateCount} candidate{role.candidateCount !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {role.daysOpen}d open
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {role.furthestStage}
                </Badge>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}

            <Button variant="outline" size="sm" className="w-full mt-2" asChild>
              <Link to="/company-jobs">{t("view_all_roles", "View All Roles")}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
