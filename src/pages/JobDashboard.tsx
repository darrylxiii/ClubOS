import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, Brain, Users, XCircle, BarChart3 } from "lucide-react";
import { JobCloseHiredDialog } from "@/components/jobs/JobCloseHiredDialog";
import { JobCloseLostDialog } from "@/components/jobs/JobCloseLostDialog";
import { JobDeleteDialog } from "@/components/jobs/JobDeleteDialog";
import { JobArchiveDialog } from "@/components/jobs/JobArchiveDialog";
import { useCloseJobWon, useCloseJobLost, useArchiveJob, useDeleteJob } from "@/hooks/useDealPipeline";
import { useRole } from "@/contexts/RoleContext";
import { RejectedCandidatesTab } from "@/components/partner/RejectedCandidatesTab";
import { EnhancedCandidateActionDialog } from "@/components/partner/EnhancedCandidateActionDialog";
import { AddStageDialog } from "@/components/partner/AddStageDialog";
import { AdminJobTools } from "@/components/partner/AdminJobTools";
import { EditJobSheet } from "@/components/partner/EditJobSheet";
import { JobAnalytics } from "@/components/partner/JobAnalytics";
import { CandidateIntelligenceDossier } from "@/components/intelligence/CandidateIntelligenceDossier";
import { ExecutiveBriefingCard } from "@/components/intelligence/ExecutiveBriefingCard";
import { PredictiveAnalyticsDashboard } from "@/components/intelligence/PredictiveAnalyticsDashboard";
import { MLInsightsWidget } from "@/components/intelligence/MLInsightsWidget";
import { useJobTeamRole } from "@/hooks/useJobTeamRole";
import { HiringManagerDashboard } from "@/components/partner/dashboards/HiringManagerDashboard";
import { ExecutiveDashboard } from "@/components/partner/dashboards/ExecutiveDashboard";
import { InterviewerDashboard } from "@/components/partner/dashboards/InterviewerDashboard";
import { ObserverDashboard } from "@/components/partner/dashboards/ObserverDashboard";

import { 
  DashboardHeader,
  MetricsStrip,
  KanbanPipeline,
  CompactSidebar
} from "@/components/job-dashboard";

interface JobMetrics {
  totalApplicants: number;
  stageBreakdown: { [key: number]: number };
  avgDaysInStage: { [key: number]: number };
  conversionRates: { [key: string]: number };
  needsClubCheck: number;
  lastActivity: string;
}

export default function JobDashboard() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { currentRole: role, loading: roleLoading } = useRole();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStage, setShowAddStage] = useState(false);
  const [showCloseHiredDialog, setShowCloseHiredDialog] = useState(false);
  const [showCloseLostDialog, setShowCloseLostDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  const closeJobWon = useCloseJobWon();
  const closeJobLost = useCloseJobLost();
  const archiveJob = useArchiveJob();
  const deleteJob = useDeleteJob();
  const [metrics, setMetrics] = useState<JobMetrics | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedCandidateForAction, setSelectedCandidateForAction] = useState<{
    candidate: any;
    action: 'advance' | 'decline';
  } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rejectedCount, setRejectedCount] = useState(0);
  const { jobRole, loading: jobRoleLoading } = useJobTeamRole(jobId!);

  // Job closure handlers
  const handleCloseWon = async (hiredCandidateId: string, actualSalary: number, placementFee: number) => {
    await closeJobWon.mutateAsync({ jobId: jobId!, hiredCandidateId, actualSalary, placementFee });
    toast.success("Job marked as hired");
    setShowCloseHiredDialog(false);
    fetchJobDetails();
  };

  const handleCloseLost = async (lossReason: string, lossNotes?: string) => {
    await closeJobLost.mutateAsync({ jobId: jobId!, lossReason, lossNotes });
    toast.success("Job closed");
    setShowCloseLostDialog(false);
    fetchJobDetails();
  };

  const handleArchive = async () => {
    await archiveJob.mutateAsync(jobId!);
    toast.success("Job archived");
    setShowArchiveDialog(false);
    navigate('/jobs');
  };

  const handleDelete = async () => {
    await deleteJob.mutateAsync(jobId!);
    toast.success("Job deleted");
    setShowDeleteDialog(false);
    navigate('/jobs');
  };

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
      fetchActivities();
      fetchTeamMembers();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          companies (name, logo_url),
          job_tools (id, is_required, proficiency_level, tools_and_skills (id, name, slug, logo_url, category))
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
      
      const stages = Array.isArray(data.pipeline_stages) ? data.pipeline_stages : [];
      await fetchApplicationsForMetrics(stages);
      
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .eq('status', 'rejected');
      
      setRejectedCount(count || 0);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error("Failed to load job");
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const { data } = await supabase
        .from('pipeline_audit_logs')
        .select(`id, action, created_at, profiles:user_id (full_name, avatar_url)`)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(10);
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data } = await supabase
        .from('job_team_assignments')
        .select(`id, user_id, team_role`)
        .eq('job_id', jobId);
      
      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        const members = data.map(m => {
          const profile = profiles?.find(p => p.id === m.user_id);
          return {
            id: m.user_id,
            name: profile?.full_name || 'Team Member',
            avatar_url: profile?.avatar_url,
            role: m.team_role
          };
        });
        setTeamMembers(members);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const fetchApplicationsForMetrics = async (stages: any[]) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .neq('status', 'rejected');

      if (error) throw error;
      
      const enrichedApps = await Promise.all((data || []).map(async (app) => {
        let profileData = null;
        
        const { data: interaction } = await supabase
          .from('candidate_interactions')
          .select(`candidate_id, candidate_profiles!candidate_interactions_candidate_id_fkey (user_id, full_name, email, avatar_url, current_title, current_company)`)
          .eq('application_id', app.id)
          .maybeSingle();
        
        if (interaction?.candidate_profiles) {
          profileData = interaction.candidate_profiles;
        } else if (app.user_id) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('id', app.user_id)
            .maybeSingle();
          profileData = userProfile;
        }
        
        return {
          ...app,
          candidate_id: interaction?.candidate_id || null,
          full_name: profileData?.full_name || app.candidate_full_name || 'Candidate',
          email: profileData?.email || app.candidate_email,
          avatar_url: profileData?.avatar_url,
          current_title: profileData?.current_title || app.candidate_title,
          current_company: profileData?.current_company || app.candidate_company,
        };
      }));
      
      setApplications(enrichedApps);
      
      // Calculate metrics
      const stageBreakdown: { [key: number]: number } = {};
      const stageDurations: { [key: number]: number[] } = {};
      
      stages.forEach(stage => {
        stageBreakdown[stage.order] = 0;
        stageDurations[stage.order] = [];
      });
      
      enrichedApps.forEach(app => {
        if (app.current_stage_index !== undefined) {
          stageBreakdown[app.current_stage_index] = (stageBreakdown[app.current_stage_index] || 0) + 1;
          const appliedDate = new Date(app.updated_at || app.applied_at);
          const daysSince = Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
          if (!stageDurations[app.current_stage_index]) stageDurations[app.current_stage_index] = [];
          stageDurations[app.current_stage_index].push(daysSince);
        }
      });
      
      const avgDaysInStage: { [key: number]: number } = {};
      Object.keys(stageDurations).forEach(key => {
        const durations = stageDurations[Number(key)];
        avgDaysInStage[Number(key)] = durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;
      });
      
      const conversionRates: { [key: string]: number } = {};
      for (let i = 0; i < stages.length - 1; i++) {
        const current = stageBreakdown[i] || 0;
        const totalPassed = enrichedApps.filter(app => app.current_stage_index > i).length;
        conversionRates[`${i}-${i + 1}`] = current > 0 ? Math.round((totalPassed / (current + totalPassed)) * 100) : 0;
      }
      
      setMetrics({
        totalApplicants: enrichedApps.length,
        stageBreakdown,
        avgDaysInStage,
        conversionRates,
        needsClubCheck: Math.min(enrichedApps.filter(app => app.current_stage_index === 0).length, 3),
        lastActivity: 'Recently',
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  if (roleLoading || jobRoleLoading || loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-24 bg-muted/30 rounded-xl" />
            <div className="h-16 bg-muted/30 rounded-xl" />
            <div className="h-96 bg-muted/30 rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Card className="border-border/40">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">Job not found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/jobs')}>
                Back to Jobs
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const stages = job.pipeline_stages || [
    { name: "Applied", order: 0 },
    { name: "Screening", order: 1 },
    { name: "Interview", order: 2 },
    { name: "Offer", order: 3 },
  ];

  const daysOpen = job?.created_at 
    ? Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const activeCandidates = metrics 
    ? Object.entries(metrics.stageBreakdown)
        .filter(([key]) => parseInt(key) > 0)
        .reduce((sum, [_, count]) => sum + count, 0)
    : 0;
  
  const avgTimeToHire = metrics 
    ? Math.round(Object.values(metrics.avgDaysInStage).reduce((a, b) => a + b, 0))
    : 0;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Admin Tools */}
        {role === 'admin' && (
          <AdminJobTools jobId={jobId!} jobTitle={job.title} onRefresh={fetchJobDetails} />
        )}

        {/* Clean Header */}
        <DashboardHeader
          job={job}
          role={role}
          onEditJob={() => setEditDialogOpen(true)}
          onCloseHired={() => setShowCloseHiredDialog(true)}
          onCloseLost={() => setShowCloseLostDialog(true)}
          onArchive={() => setShowArchiveDialog(true)}
          onDelete={() => setShowDeleteDialog(true)}
        />

        {/* Metrics Strip */}
        <MetricsStrip
          totalCandidates={metrics?.totalApplicants || 0}
          activeCandidates={activeCandidates}
          daysOpen={daysOpen}
          avgTimeToHire={avgTimeToHire}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Main Content */}
          <main className="space-y-6">
            {/* Kanban Pipeline */}
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                Pipeline
              </h2>
              <KanbanPipeline
                stages={stages}
                applications={applications}
                avgDaysInStage={metrics?.avgDaysInStage || {}}
                jobId={jobId!}
                onAdvanceCandidate={(candidate) => setSelectedCandidateForAction({ candidate, action: 'advance' })}
                onRejectCandidate={(candidate) => setSelectedCandidateForAction({ candidate, action: 'decline' })}
                onAddStage={() => setShowAddStage(true)}
              />
            </section>

            {/* Tabs for Secondary Content */}
            <Tabs defaultValue="intelligence" className="w-full">
              <TabsList className="bg-muted/30 border border-border/40 p-1">
                <TabsTrigger value="intelligence" className="gap-2 data-[state=active]:bg-background">
                  <Brain className="w-4 h-4" />
                  Intelligence
                </TabsTrigger>
                {jobRole && (
                  <TabsTrigger value="my-view" className="gap-2 data-[state=active]:bg-background">
                    <Target className="w-4 h-4" />
                    My View
                  </TabsTrigger>
                )}
                <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-background">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2 data-[state=active]:bg-background">
                  <XCircle className="w-4 h-4" />
                  Rejected ({rejectedCount})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="intelligence" className="mt-6 space-y-6">
                <PredictiveAnalyticsDashboard jobId={job.id} />
                <MLInsightsWidget jobId={job.id} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border border-border/40">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Top Candidates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {applications.filter(app => app.status !== 'rejected').slice(0, 3).map(app => (
                        <CandidateIntelligenceDossier key={app.id} candidateId={app.candidate_id} jobId={job.id} />
                      ))}
                      {applications.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No candidates yet</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-border/40">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Executive Briefings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {applications.filter(app => app.status !== 'rejected').slice(0, 3).map(app => (
                        <ExecutiveBriefingCard key={app.id} candidateId={app.candidate_id} jobId={job.id} compact={false} />
                      ))}
                      {applications.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No candidates yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="my-view" className="mt-6">
                {jobRole === 'hiring_manager' && <HiringManagerDashboard jobId={job.id} />}
                {jobRole === 'founder_reviewer' && <ExecutiveDashboard jobId={job.id} />}
                {['technical_interviewer', 'behavioral_interviewer', 'panel_member'].includes(jobRole || '') && 
                  <InterviewerDashboard jobId={job.id} />
                }
                {jobRole === 'observer' && <ObserverDashboard jobId={job.id} />}
                {!jobRole && (
                  <Card className="border border-border/40">
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground">No role assigned for this job.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <JobAnalytics jobId={job.id} />
              </TabsContent>

              <TabsContent value="rejected" className="mt-6">
                <RejectedCandidatesTab jobId={job.id} stages={stages} />
              </TabsContent>
            </Tabs>
          </main>

          {/* Sidebar */}
          <aside className="order-first lg:order-last">
            <CompactSidebar
              job={job}
              metrics={metrics}
              stages={stages}
              activities={activities}
              teamMembers={teamMembers}
            />
          </aside>
        </div>
      </div>

      {/* Dialogs */}
      <AddStageDialog
        open={showAddStage}
        onOpenChange={setShowAddStage}
        onSave={async (newStage) => {
          const updatedStages = [...stages, newStage];
          const { error } = await supabase.from('jobs').update({ pipeline_stages: updatedStages }).eq('id', jobId);
          if (!error) { await fetchJobDetails(); return { success: true }; }
          return { success: false };
        }}
        currentStagesCount={stages.length}
        jobId={jobId || ''}
        companyId={job?.company_id || ''}
      />

      {selectedCandidateForAction && (
        <EnhancedCandidateActionDialog
          open={!!selectedCandidateForAction}
          onOpenChange={(open) => !open && setSelectedCandidateForAction(null)}
          candidateId={selectedCandidateForAction.candidate.candidate_id || selectedCandidateForAction.candidate.user_id}
          candidateName={selectedCandidateForAction.candidate.full_name || 'Candidate'}
          applicationId={selectedCandidateForAction.candidate.id}
          jobId={job.id}
          jobTitle={job.title}
          companyName={job.companies?.name || ''}
          currentStage={stages[selectedCandidateForAction.candidate.current_stage_index]?.name || ''}
          currentStageIndex={selectedCandidateForAction.candidate.current_stage_index}
          stages={stages}
          nextStage={stages[selectedCandidateForAction.candidate.current_stage_index + 1]?.name}
          actionType={selectedCandidateForAction.action}
          onComplete={() => { setSelectedCandidateForAction(null); fetchJobDetails(); }}
        />
      )}

      {job && (
        <EditJobSheet open={editDialogOpen} onOpenChange={setEditDialogOpen} job={job} onJobUpdated={fetchJobDetails} />
      )}

      <JobCloseHiredDialog open={showCloseHiredDialog} onOpenChange={setShowCloseHiredDialog} job={job} applications={applications} onConfirm={handleCloseWon} />
      <JobCloseLostDialog open={showCloseLostDialog} onOpenChange={setShowCloseLostDialog} job={job} applications={applications} onConfirm={handleCloseLost} />
      <JobArchiveDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog} job={job} onConfirm={handleArchive} />
      <JobDeleteDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} job={job} applicationCount={applications.length} isAdmin={role === 'admin'} onConfirm={handleDelete} />
    </AppLayout>
  );
}
