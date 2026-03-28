import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Briefcase, MapPin, DollarSign, Clock, Building2, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UnifiedLoader } from '@/components/ui/unified-loader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PendingJob {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  created_at: string;
  created_by: string | null;
  company_id: string | null;
  companies: { name: string; logo_url: string | null } | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

const JobApprovals = () => {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [declineJobId, setDeclineJobId] = useState<string | null>(null);

  const { data: pendingJobs, isLoading } = useQuery({
    queryKey: ['pending-jobs'],
    queryFn: async (): Promise<PendingJob[]> => {
      const { data, error } = await (supabase as any)
        .from('jobs')
        .select('id, title, description, location, employment_type, salary_min, salary_max, currency, created_at, created_by, company_id, companies(name, logo_url), profiles!jobs_created_by_fkey(full_name, email)')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PendingJob[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'published', published_at: new Date().toISOString() } as any)
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job approved and published.");
      queryClient.invalidateQueries({ queryKey: ['pending-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: () => toast.error("Failed to approve job."),
  });

  const declineMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'draft' })
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job declined and moved to draft.");
      setDeclineJobId(null);
      queryClient.invalidateQueries({ queryKey: ['pending-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: () => toast.error("Failed to decline job."),
  });

  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return null;
    const cur = currency?.toUpperCase() || 'EUR';
    if (min && max) return `${cur} ${min.toLocaleString()} – ${max.toLocaleString()}`;
    if (min) return `From ${cur} ${min.toLocaleString()}`;
    return `Up to ${cur} ${max!.toLocaleString()}`;
  };

  return (
    <>
      <RoleGate allowedRoles={['admin', 'strategist']} showLoading>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{t('jobApprovals.title')}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t('jobApprovals.desc')}</p>
            </div>
            {pendingJobs && pendingJobs.length > 0 && (
              <Badge variant="secondary" className="text-sm">
                {pendingJobs.length} pending
              </Badge>
            )}
          </div>

          {isLoading ? (
            <UnifiedLoader variant="section" />
          ) : !pendingJobs || pendingJobs.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">{t('jobApprovals.desc2')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingJobs.map((job) => (
                <Card key={job.id} className="border-border/60">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <CardTitle className="text-lg font-medium text-foreground truncate">
                          {job.title}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {job.companies?.name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {job.companies.name}
                            </span>
                          )}
                          {job.profiles?.full_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {job.profiles.full_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location}
                        </span>
                      )}
                      {job.employment_type && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {job.employment_type}
                        </Badge>
                      )}
                      {formatSalary(job.salary_min, job.salary_max, job.currency) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          {formatSalary(job.salary_min, job.salary_max, job.currency)}
                        </span>
                      )}
                    </div>

                    {job.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(job.id)}
                        disabled={approveMutation.isPending}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeclineJobId(job.id)}
                        disabled={declineMutation.isPending}
                        className="gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <AlertDialog open={!!declineJobId} onOpenChange={(open) => !open && setDeclineJobId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline this job?</AlertDialogTitle>
              <AlertDialogDescription>
                The job will be moved back to draft. The partner can edit and resubmit it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common:cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => declineJobId && declineMutation.mutate(declineJobId)}
              >
                Decline
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </RoleGate>
    </>
  );
};

export default JobApprovals;
