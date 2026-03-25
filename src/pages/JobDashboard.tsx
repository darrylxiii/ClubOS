import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useJobDashboardData, type PipelineStage, type EnrichedApplication } from "@/hooks/useJobDashboardData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { SharePipelineDialog } from "@/components/jobs/SharePipelineDialog";
import { JobClosureDialog } from "@/components/jobs/JobClosureDialog";
import { JobDeleteDialog } from "@/components/jobs/JobDeleteDialog";
import { JobArchiveDialog } from "@/components/jobs/JobArchiveDialog";
import { useArchiveJob, useDeleteJob } from "@/hooks/useDealPipeline";
import { useRole } from "@/contexts/RoleContext";
import { RejectedCandidatesTab } from "@/components/partner/RejectedCandidatesTab";
import { EnhancedCandidateActionDialog } from "@/components/partner/EnhancedCandidateActionDialog";
import { InternalReviewPanel } from "@/components/partner/InternalReviewPanel";
import { PartnerFirstReviewPanel } from "@/components/partner/PartnerFirstReviewPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddStageDialog } from "@/components/partner/AddStageDialog";
import { AdminJobTools } from "@/components/partner/AdminJobTools";
import { EditJobSheet } from "@/components/partner/EditJobSheet";
import { JobAnalytics } from "@/components/partner/JobAnalytics";
import { JobTeamPanel } from "@/components/partner/JobTeamPanel";
import { PipelineAuditLog } from "@/components/partner/PipelineAuditLog";
import { TeamActivityCard } from "@/components/partner/TeamActivityCard";
import { EntityKnowledgeProfile } from "@/components/intelligence/EntityKnowledgeProfile";
import { JobDashboardHeader } from "@/components/job-dashboard/JobDashboardHeader";
import { JobDashboardStatsBar } from "@/components/job-dashboard/JobDashboardStatsBar";
import { PipelineKanbanBoard } from "@/components/job-dashboard/PipelineKanbanBoard";
import { InlineActivityFeed } from "@/components/job-dashboard/InlineActivityFeed";
import { JobTasksPanel } from "@/components/job-dashboard/JobTasksPanel";
import { InlineDocumentsCard } from "@/components/job-dashboard/InlineDocumentsCard";
import { EmailDumpTab } from "@/components/jobs/email-dump";
import { JobInterviewRecordingsPanel } from "@/components/partner/JobInterviewRecordingsPanel";
import { ManualInterviewEntryDialog } from "@/components/partner/ManualInterviewEntryDialog";
import { CalendarInterviewLinker } from "@/components/partner/CalendarInterviewLinker";

export default function JobDashboard() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { currentRole: role, loading: roleLoading } = useRole();

  const {
    job,
    applications,
    metrics,
    rejectedCount,
    activeShareCount,
    loading,
    refetch: fetchJobDetails,
  } = useJobDashboardData(jobId, role);

  const [showAddStage, setShowAddStage] = useState(false);
  const [showManualInterview, setShowManualInterview] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showBrainConfig, setShowBrainConfig] = useState(false);
  const [showCalendarLinker, setShowCalendarLinker] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pendingStageDelete, setPendingStageDelete] = useState<{
    index: number;
    message: string;
    stageApps: EnrichedApplication[];
  } | null>(null);
  const [selectedCandidateForAction, setSelectedCandidateForAction] = useState<{
    candidate: EnrichedApplication;
    action: 'advance' | 'decline' | 'move_back';
  } | null>(null);

  const archiveJob = useArchiveJob();
  const deleteJob = useDeleteJob();

  const handleClosureComplete = () => {
    setShowClosureDialog(false);
    setTimeout(() => fetchJobDetails(), 300);
  };

  const handleArchive = async () => {
    await archiveJob.mutateAsync(jobId!);
    toast.success("Job archived successfully");
    setShowArchiveDialog(false);
    navigate('/jobs');
  };

  const handleDelete = async () => {
    await deleteJob.mutateAsync(jobId!);
    toast.success("Job deleted successfully");
    setShowDeleteDialog(false);
    navigate('/jobs');
  };

  // Loading state
  if (roleLoading || loading) {
    return (
      <div className="animate-pulse space-y-4 px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-12 bg-muted/30 rounded-xl" />
        <div className="h-10 bg-muted/20 rounded-lg" />
        <div className="h-[400px] bg-muted/20 rounded-xl" />
      </div>
    );
  }

  if (!job) {
    return (
      <Card className="mx-4 sm:mx-6 lg:mx-8 my-6">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Job not found</p>
        </CardContent>
      </Card>
    );
  }

  const stages = job.pipeline_stages || [
    { name: "Applied", order: 0 },
    { name: "Screening", order: 1 },
    { name: "Interview", order: 2 },
    { name: "Offer", order: 3 },
  ];

  const internalReviewPendingCount = applications.filter(
    (app) => app.status !== 'rejected' && app.internal_review_status === 'pending',
  ).length;

  const partnerReviewPendingCount = applications.filter(
    (app) =>
      app.internal_review_status === 'approved' &&
      (app.partner_review_status === null ||
        typeof app.partner_review_status === 'undefined' ||
        app.partner_review_status === 'pending'),
  ).length;

  const pendingReviewsCount = internalReviewPendingCount + partnerReviewPendingCount;

  const daysOpen = job.created_at
    ? Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const activeCandidates = metrics
    ? Object.entries(metrics.stageBreakdown)
        .filter(([key]) => parseInt(key) > 0)
        .reduce((sum, [_, count]) => sum + (count as number), 0)
    : 0;

  const avgTimeToHire = metrics
    ? Math.round(Object.values(metrics.avgDaysInStage).reduce((a: number, b: unknown) => a + (b as number), 0))
    : 0;

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 space-y-4 animate-fade-in">
        {/* Share Dialog */}
        {job && (
          <SharePipelineDialog
            open={showShareDialog}
            onOpenChange={(open) => {
              setShowShareDialog(open);
              if (!open) fetchJobDetails();
            }}
            jobId={job.id}
            jobTitle={job.title}
          />
        )}

        {/* Admin Tools Bar */}
        {role === 'admin' && (
          <AdminJobTools jobId={jobId!} jobTitle={job.title} companyName={job.companies?.name || ''} onRefresh={fetchJobDetails} />
        )}

        {/* Job Context Dialog */}
        <Dialog open={showBrainConfig} onOpenChange={setShowBrainConfig}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Job Context Configuration</DialogTitle>
            </DialogHeader>
            <EntityKnowledgeProfile
              entityId={jobId!}
              entityType="job"
              title="Job Knowledge & Voice"
              description="Tailor the AI's understanding of this specific role."
            />
          </DialogContent>
        </Dialog>

        {/* 1. Compact Header */}
        <JobDashboardHeader
          job={job}
          role={role}
          activeShareCount={activeShareCount}
          onEdit={() => setEditDialogOpen(true)}
          onShare={() => setShowShareDialog(true)}
          onJobContext={() => setShowBrainConfig(true)}
          onClose={() => setShowClosureDialog(true)}
          onArchive={() => setShowArchiveDialog(true)}
          onDelete={() => setShowDeleteDialog(true)}
        />

        {/* 2. Inline Stats Bar */}
        <JobDashboardStatsBar
          totalCandidates={metrics?.totalApplicants || 0}
          activeCandidates={activeCandidates}
          pendingReviews={pendingReviewsCount}
          daysOpen={daysOpen}
          conversionRate={metrics?.conversionRates?.['0-1'] || 0}
          avgTimeToHire={avgTimeToHire}
        />

        {/* 3. Pipeline Kanban — Hero Section */}
        <PipelineKanbanBoard
          stages={stages}
          applications={applications}
          metrics={metrics}
          onAddStage={() => setShowAddStage(true)}
          onAdvanceCandidate={(candidate) =>
            setSelectedCandidateForAction({ candidate, action: 'advance' })
          }
          onRejectCandidate={(candidate) =>
            setSelectedCandidateForAction({ candidate, action: 'decline' })
          }
          onViewProfile={(candidate) => {
            const candidateId = candidate.candidate_id || candidate.user_id;
            if (!candidateId) {
              toast.error('Unable to load candidate profile');
              return;
            }
            const stageIndex = candidate.current_stage_index || 0;
            const stageName = stages[stageIndex]?.name || '';
            navigate(`/candidate/${candidateId}?fromJob=${jobId}&stage=${encodeURIComponent(stageName)}&stageIndex=${stageIndex}`);
          }}
        />

        {/* 4. Streamlined Tabs */}
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="w-full justify-start bg-card/30 backdrop-blur-sm border border-border/20 p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="reviews" className="text-xs data-[state=active]:bg-background/60">
              Reviews
              {pendingReviewsCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1.5">{pendingReviewsCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs data-[state=active]:bg-background/60">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs data-[state=active]:bg-background/60">
              Activity
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs data-[state=active]:bg-background/60">
              Rejected
              {rejectedCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1.5">{rejectedCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs data-[state=active]:bg-background/60">
              Tasks
            </TabsTrigger>
            {(role === 'admin' || role === 'strategist') && (
              <TabsTrigger value="more" className="text-xs data-[state=active]:bg-background/60">
                More
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="reviews" className="space-y-4 mt-4">
            {(role === 'admin' || role === 'strategist') && <InternalReviewPanel jobId={job.id} />}
            <PartnerFirstReviewPanel jobId={job.id} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-4">
            <JobInterviewRecordingsPanel jobId={job.id} />
            <JobAnalytics jobId={job.id} />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <InlineActivityFeed jobId={job.id} initialLimit={10} />
              <div className="space-y-4">
                <TeamActivityCard jobId={job.id} />
                <JobTeamPanel jobId={job.id} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-4">
            <RejectedCandidatesTab jobId={job.id} stages={stages} />
          </TabsContent>

          {(role === 'admin' || role === 'strategist') && (
            <TabsContent value="more" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PipelineAuditLog jobId={job.id} />
                <InlineDocumentsCard jobId={job.id} />
              </div>
              <EmailDumpTab
                jobId={job.id}
                jobTitle={job.title}
                companyName={job.companies?.name || ''}
                onCandidatesImported={fetchJobDetails}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Dialogs — kept outside main flow */}
      <AddStageDialog
        open={showAddStage}
        onOpenChange={setShowAddStage}
        onSave={async (newStage) => {
          const updatedStages = [...stages, newStage];
          const { error } = await supabase
            .from('jobs')
            .update({ pipeline_stages: updatedStages })
            .eq('id', jobId);
          if (!error) {
            await fetchJobDetails();
            return { success: true };
          }
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
          onComplete={() => {
            setSelectedCandidateForAction(null);
            fetchJobDetails();
          }}
        />
      )}

      {job && (
        <EditJobSheet
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          job={job}
          onJobUpdated={fetchJobDetails}
        />
      )}

      <ManualInterviewEntryDialog
        open={showManualInterview}
        onOpenChange={setShowManualInterview}
        jobId={jobId}
        onInterviewAdded={fetchJobDetails}
      />

      <CalendarInterviewLinker
        open={showCalendarLinker}
        onOpenChange={setShowCalendarLinker}
        jobId={jobId}
        applications={applications}
        onInterviewLinked={fetchJobDetails}
      />

      <JobClosureDialog
        open={showClosureDialog}
        onOpenChange={setShowClosureDialog}
        job={job}
        applications={applications}
        onComplete={handleClosureComplete}
      />

      <JobArchiveDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        job={job}
        onConfirm={handleArchive}
      />

      <JobDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        job={job}
        applicationCount={applications.length}
        isAdmin={role === 'admin'}
        onConfirm={handleDelete}
      />
    </>
  );
}
