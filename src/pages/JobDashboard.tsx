import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Users, Sparkles, Building2, Video, MapPin, ClipboardList, Plus, Save, Edit, AlertCircle, Brain, Target, MoreHorizontal, Trophy, Archive, Trash2 } from "lucide-react";
import { ContinuousPipelineBadge } from "@/components/jobs/ContinuousPipelineBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { JobClosureDialog } from "@/components/jobs/JobClosureDialog";
import { JobDeleteDialog } from "@/components/jobs/JobDeleteDialog";
import { JobArchiveDialog } from "@/components/jobs/JobArchiveDialog";
import { useCloseJobLost, useArchiveJob, useDeleteJob } from "@/hooks/useDealPipeline";
import { useRole } from "@/contexts/RoleContext";
import { QuickActionsBar } from "@/components/partner/QuickActionsBar";
import { SmartInsightsCard } from "@/components/partner/SmartInsightsCard";
import { TeamActivityCard } from "@/components/partner/TeamActivityCard";
import { RejectedCandidatesTab } from "@/components/partner/RejectedCandidatesTab";
import { EnhancedCandidateActionDialog } from "@/components/partner/EnhancedCandidateActionDialog";
import { ExpandablePipelineStage } from "@/components/partner/ExpandablePipelineStage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PipelineDisplaySettings, defaultSettings, type DisplaySettings } from "@/components/partner/PipelineDisplaySettings";
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
import { ManualInterviewEntryDialog } from "@/components/partner/ManualInterviewEntryDialog";
import { CalendarInterviewLinker } from "@/components/partner/CalendarInterviewLinker";
import { EntityKnowledgeProfile } from "@/components/intelligence/EntityKnowledgeProfile";
import {
  JobDashboardSidebar,
  CandidatesAtRiskPanel,
  PipelineVelocityTracker,
  CandidateLeaderboard,
  JobPerformanceScorecard
} from "@/components/job-dashboard";
import { motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";

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
  const [showManualInterview, setShowManualInterview] = useState(false);
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const closeJobLost = useCloseJobLost();
  const archiveJob = useArchiveJob();
  const deleteJob = useDeleteJob();
  const [showBrainConfig, setShowBrainConfig] = useState(false);
  const [showCalendarLinker, setShowCalendarLinker] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<JobMetrics | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(defaultSettings);
  const [selectedStageForCandidates, setSelectedStageForCandidates] = useState<any>(null);
  const [selectedCandidateForAction, setSelectedCandidateForAction] = useState<{
    candidate: any;
    action: 'advance' | 'decline';
  } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [expandedStageIndices, setExpandedStageIndices] = useState<Set<number>>(new Set());
  const { jobRole, permissions, loading: jobRoleLoading } = useJobTeamRole(jobId!);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Defensive stage derivation - Moved up to avoid ReferenceError in handleDragEnd
  const stages = useMemo(() => {
    const rawStages = job?.pipeline_stages;
    const defaultStages = [
      { name: "Applied", order: 0 },
      { name: "Screening", order: 1 },
      { name: "Interview", order: 2 },
      { name: "Offer", order: 3 },
    ];

    if (!Array.isArray(rawStages)) return defaultStages;

    // Ensure each stage has an order property for sorting
    return rawStages.map((s, i) => ({
      ...s,
      order: typeof s.order === 'number' ? s.order : i
    }));
  }, [job?.pipeline_stages]);

  // Load display settings from localStorage
  useEffect(() => {
    if (jobId) {
      const saved = localStorage.getItem(`pipeline-breakdown-display-${jobId}`);
      if (saved) {
        try {
          setDisplaySettings(JSON.parse(saved));
        } catch (_e) {
          console.error('Failed to parse display settings:', e);
        }
      }
    }
  }, [jobId]);

  const toggleStageExpansion = (stageIndex: number) => {
    setExpandedStageIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageIndex)) {
        newSet.delete(stageIndex);
      } else {
        newSet.add(stageIndex);
      }
      return newSet;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace('stage-', ''));
      const newIndex = parseInt(over.id.toString().replace('stage-', ''));

      const updatedStages = [...stages];
      const [movedStage] = updatedStages.splice(oldIndex, 1);
      updatedStages.splice(newIndex, 0, movedStage);

      // Update order values
      const reorderedStages = updatedStages.map((stage, index) => ({
        ...stage,
        order: index
      }));

      const { error } = await supabase
        .from('jobs')
        .update({ pipeline_stages: reorderedStages })
        .eq('id', jobId);

      if (!error) {
        await fetchJobDetails();
        toast.success("Pipeline reordered successfully");
      } else {
        toast.error("Failed to reorder pipeline");
      }
    }
  };

  // Job closure handler - now handled by unified dialog
  const handleClosureComplete = () => {
    setShowClosureDialog(false);
    // Delay fetch to let dialog animation complete
    setTimeout(() => {
      fetchJobDetails();
    }, 300);
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

  // Fetch job details on mount (authorization already handled by JobDashboardRoute)
  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          companies (
            id,
            name,
            logo_url,
            placement_fee_percentage,
            fee_type,
            placement_fee_fixed
          ),
          job_tools (
            id,
            is_required,
            proficiency_level,
            tools_and_skills (
              id,
              name,
              slug,
              logo_url,
              category
            )
          )
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);

      // Log job view (once per session to avoid spam)
      const sessionKey = `job_view_logged_${jobId}`;
      if (!sessionStorage.getItem(sessionKey)) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('pipeline_audit_logs').insert({
            job_id: jobId,
            user_id: user.id,
            action: 'job_viewed',
            stage_data: {
              page: 'dashboard',
              view_timestamp: new Date().toISOString()
            },
            metadata: {
              referrer: document.referrer || 'direct',
              user_agent: navigator.userAgent.substring(0, 200)
            }
          });
          sessionStorage.setItem(sessionKey, 'true');
        }
      }

      // Fetch applications for metrics
      const stages = Array.isArray(data.pipeline_stages) ? data.pipeline_stages : [];
      await fetchApplicationsForMetrics(stages);

      // Fetch rejected count
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .eq('status', 'rejected');

      setRejectedCount(count || 0);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error("Failed to load job details");
      navigate('/jobs');
    } finally {
      setLoading(false);
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

      // Enrich with candidate profile data - 4-tier fallback strategy for enterprise reliability
      const enrichedApps = await Promise.all((data || []).map(async (app) => {
        let profileData = null;
        let linkedUserId = app.user_id;
        let candidateId = app.candidate_id || null;

        // Strategy 1: Try candidate_interactions join (works for most existing candidates)
        const { data: interaction } = await supabase
          .from('candidate_interactions')
          .select(`
            candidate_id,
            candidate_profiles!candidate_interactions_candidate_id_fkey (
              user_id,
              full_name,
              email,
              phone,
              avatar_url,
              current_title,
              current_company,
              linkedin_url
            )
          `)
          .eq('application_id', app.id)
          .maybeSingle();

        if (interaction?.candidate_profiles) {
          profileData = interaction.candidate_profiles;
          candidateId = interaction.candidate_id;
          // Use linked user_id from candidate_profile if available
          if (profileData.user_id) {
            linkedUserId = profileData.user_id;

            // If candidate_profile is linked to user, get user's latest avatar
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', profileData.user_id)
              .maybeSingle();

            if (userProfile?.avatar_url) {
              profileData.avatar_url = userProfile.avatar_url;
            }
          }
        }
        // Strategy 2: Direct candidate_profiles lookup via app.candidate_id
        else if (app.candidate_id) {
          const { data: candidateProfile } = await supabase
            .from('candidate_profiles')
            .select('user_id, full_name, email, phone, avatar_url, current_title, current_company, linkedin_url')
            .eq('id', app.candidate_id)
            .maybeSingle();

          if (candidateProfile) {
            profileData = candidateProfile;
            candidateId = app.candidate_id;
            if (candidateProfile.user_id) {
              linkedUserId = candidateProfile.user_id;

              // Get user's latest avatar if linked
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', candidateProfile.user_id)
                .maybeSingle();

              if (userProfile?.avatar_url) {
                profileData.avatar_url = userProfile.avatar_url;
              }
            }
          }
        }
        // Strategy 3: Fallback to user profile (for user-applied candidates)
        else if (app.user_id) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, email, phone, avatar_url')
            .eq('id', app.user_id)
            .maybeSingle();
          profileData = userProfile;
        }

        // Strategy 4: Use embedded application fields as ultimate fallback
        return {
          ...app,
          candidate_id: candidateId,
          full_name: profileData?.full_name || app.candidate_full_name || 'Candidate',
          email: profileData?.email || app.candidate_email,
          phone: profileData?.phone || app.candidate_phone,
          avatar_url: profileData?.avatar_url,
          current_title: profileData?.current_title || app.candidate_title,
          current_company: profileData?.current_company || app.candidate_company,
          linkedin_url: profileData?.linkedin_url || app.candidate_linkedin_url,
          user_id: linkedUserId,
          stages: app.stages || [],
          is_linked_user: !!profileData?.user_id,
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
          stageBreakdown[app.current_stage_index]++;

          // Calculate days in current stage
          const appliedDate = new Date(app.updated_at || app.applied_at);
          const daysSince = Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
          stageDurations[app.current_stage_index].push(daysSince);
        }
      });

      // Calculate average days per stage
      const avgDaysInStage: { [key: number]: number } = {};
      Object.keys(stageDurations).forEach(key => {
        const durations = stageDurations[Number(key)];
        avgDaysInStage[Number(key)] = durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;
      });

      // Calculate conversion rates
      const conversionRates: { [key: string]: number } = {};
      for (let i = 0; i < stages.length - 1; i++) {
        const current = stageBreakdown[i] || 0;
        const next = stageBreakdown[i + 1] || 0;
        const totalPassed = enrichedApps.filter(app => app.current_stage_index > i).length;
        conversionRates[`${i}-${i + 1}`] = current > 0 ? Math.round((totalPassed / (current + totalPassed)) * 100) : 0;
      }

      // Find last activity
      const lastApp = enrichedApps.sort((a, b) =>
        new Date(b.updated_at || b.applied_at).getTime() - new Date(a.updated_at || a.applied_at).getTime()
      )[0];

      const lastActivity = lastApp
        ? `${Math.floor((Date.now() - new Date(lastApp.updated_at || lastApp.applied_at).getTime()) / (1000 * 60 * 60))}h ago`
        : 'No activity yet';

      // Mock "needs club check" - in production, filter by club_check_status field
      const needsClubCheck = Math.min(enrichedApps.filter(app => app.current_stage_index === 0).length, 3);

      setMetrics({
        totalApplicants: enrichedApps.length,
        stageBreakdown,
        avgDaysInStage,
        conversionRates,
        needsClubCheck,
        lastActivity,
      });
    } catch (error) {
      console.error('Error fetching applications for metrics:', error);
    }
  };

  if (roleLoading || jobRoleLoading || loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Job not found</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }


  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6 animate-fade-in">
        {/* Admin Tools Bar - Only visible to admins */}
        {role === 'admin' && (
          <SectionErrorBoundary
            sectionName="Admin Tools"
            fallback={<div className="p-4 border border-red-200 rounded text-red-500 text-sm">Failed to load Admin Tools</div>}
          >
            <AdminJobTools
              jobId={jobId!}
              jobTitle={job.title}
              onRefresh={fetchJobDetails}
            />
          </SectionErrorBoundary>
        )}

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

        {/* Premium Header with Glass Morphism */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl p-6 md:p-8 shadow-[var(--shadow-glass-lg)]">
          <div className="absolute inset-0 bg-gradient-to-r from-muted/10 via-transparent to-muted/10" />

          <div className="relative flex flex-col md:flex-row items-start justify-between gap-4">
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/jobs')}
                className="mb-2 hover:bg-muted/20 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Jobs
              </Button>
              <div className="flex items-center gap-4">
                {job.companies?.logo_url && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-muted/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                    <img
                      src={job.companies.logo_url}
                      alt={job.companies.name}
                      className="relative w-16 h-16 rounded-xl object-cover border-2 border-border/30 shadow-lg"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <h1 className="text-4xl font-black uppercase bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
                    {job.title}
                  </h1>
                  <p className="text-muted-foreground font-medium">{job.companies?.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBrainConfig(true)}
                className="h-9 gap-2 border-border/30 hover:border-border/50 hover:bg-muted/10 transition-all"
              >
                <Brain className="w-4 h-4" />
                Job Context
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
                className="h-9 gap-2 border-border/30 hover:border-border/50 hover:bg-muted/10 transition-all"
              >
                <Edit className="w-4 h-4" />
                Edit Job
              </Button>

              {/* Job Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {job.status !== 'closed' && (
                    <DropdownMenuItem onClick={() => setShowClosureDialog(true)}>
                      <Trophy className="w-4 h-4 mr-2 text-success" />
                      Close Job
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Job
                  </DropdownMenuItem>
                  {(job.status === 'draft' || role === 'admin') && (
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Job
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge
                variant={job.status === 'published' ? 'default' : 'secondary'}
                className="h-8 px-4 text-sm font-bold animate-pulse"
              >
                {job.status}
              </Badge>

              {/* Continuous Pipeline Badge */}
              <ContinuousPipelineBadge
                isContinuous={job.is_continuous}
                hiredCount={job.hired_count || 0}
                targetHireCount={job.target_hire_count}
                size="lg"
                showProgress={true}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <QuickActionsBar
          jobId={job.id}
          jobTitle={job.title}
          candidateCount={metrics?.totalApplicants || 0}
        />

        {/* NEW 70/30 Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Main Content (Left - 70%) */}
          <main className="space-y-6">
            {/* Candidates at Risk - Top Priority Alert */}
            {metrics && applications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <SectionErrorBoundary sectionName="Candidates At Risk">
                  <CandidatesAtRiskPanel
                    applications={applications}
                    stages={stages}
                    avgDaysInStage={metrics.avgDaysInStage}
                    jobId={jobId!}
                  />
                </SectionErrorBoundary>
              </motion.div>
            )}

            {/* Pipeline Velocity & Performance - Side by Side */}
            {metrics && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SectionErrorBoundary sectionName="Pipeline Velocity">
                  <PipelineVelocityTracker
                    stages={stages}
                    avgDaysInStage={metrics.avgDaysInStage}
                    stageBreakdown={metrics.stageBreakdown}
                  />
                </SectionErrorBoundary>
                <SectionErrorBoundary sectionName="Performance Scorecard">
                  <JobPerformanceScorecard
                    metrics={metrics}
                    daysOpen={Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                  />
                </SectionErrorBoundary>
              </div>
            )}

            {/* Top Candidates Leaderboard */}
            {applications.length > 0 && (
              <SectionErrorBoundary sectionName="Candidate Leaderboard">
                <CandidateLeaderboard
                  applications={applications}
                  stages={stages}
                  jobId={jobId!}
                />
              </SectionErrorBoundary>
            )}

            {/* Smart Insights - Promoted */}
            {metrics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <SectionErrorBoundary sectionName="Smart Insights">
                  <SmartInsightsCard metrics={metrics} stages={stages} />
                </SectionErrorBoundary>
              </motion.div>
            )}

            {/* Enhanced Pipeline Breakdown */}
            <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl shadow-[var(--shadow-glass-md)] hover:shadow-[var(--shadow-glass-lg)] transition-all duration-300">
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-black uppercase">Pipeline Breakdown</CardTitle>
                    <div className="flex gap-2">
                      <PipelineDisplaySettings
                        jobId={job.id}
                        settings={displaySettings}
                        onSettingsChange={setDisplaySettings}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddStage(true)}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Stage
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast.success("Pipeline template saved");
                        }}
                        className="gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save as Template
                      </Button>
                    </div>
                  </div>

                  {/* Icon Legend */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-background/40 backdrop-blur-sm rounded-lg p-3 border border-border/20">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>Your Company</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Quantum Club Elite</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      <span>Online</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>In-Person</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Hybrid</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      <span>Assessment</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <SectionErrorBoundary sectionName="Pipeline Kanban">
                  <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    sensors={sensors}
                  >
                    <SortableContext
                      items={stages.map((_, i) => `stage-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3 md:space-y-4">
                        {[...stages].sort((a, b) => a.order - b.order).map((stage, index) => {
                          const count = metrics?.stageBreakdown[stage.order] || 0;
                          const avgDays = metrics?.avgDaysInStage[stage.order] || 0;
                          const nextConversion = metrics?.conversionRates[`${stage.order}-${stage.order + 1}`];
                          const stageApplications = applications.filter(app => app.current_stage_index === stage.order);

                          // Stage health indicator
                          const stageHealth = avgDays > 14 ? 'red' : avgDays > 7 ? 'yellow' : 'green';

                          return (
                            <ExpandablePipelineStage
                              key={`stage-${index}`}
                              stage={stage}
                              stageIndex={stage.order}
                              candidateCount={count}
                              avgDays={avgDays}
                              conversionRate={nextConversion}
                              applications={stageApplications}
                              jobId={jobId!}
                              isExpanded={expandedStageIndices.has(stage.order)}
                              onToggleExpand={() => toggleStageExpansion(stage.order)}
                              displaySettings={displaySettings}
                              totalStages={stages.length}
                              onEdit={(updatedStage) => {
                                // Save inline edits
                                const updatedStages = [...stages];
                                updatedStages[index] = { ...updatedStage, order: index };

                                supabase
                                  .from('jobs')
                                  .update({ pipeline_stages: updatedStages })
                                  .eq('id', jobId)
                                  .then(({ error }) => {
                                    if (!error) {
                                      fetchJobDetails();
                                      toast.success("Stage updated successfully");
                                    } else {
                                      toast.error("Failed to update stage");
                                    }
                                  });
                              }}
                              onDuplicate={async () => {
                                const duplicatedStage = {
                                  ...stage,
                                  name: `${stage.name} (Copy)`,
                                  order: stages.length
                                };
                                const updatedStages = [...stages, duplicatedStage];

                                const { error } = await supabase
                                  .from('jobs')
                                  .update({ pipeline_stages: updatedStages })
                                  .eq('id', jobId);

                                if (!error) {
                                  await fetchJobDetails();
                                  toast.success("Stage duplicated successfully");
                                } else {
                                  toast.error("Failed to duplicate stage");
                                }
                              }}
                              onDelete={async () => {
                                const updatedStages = stages
                                  .filter((_, i) => i !== index)
                                  .map((s, i) => ({ ...s, order: i }));

                                const { error } = await supabase
                                  .from('jobs')
                                  .update({ pipeline_stages: updatedStages })
                                  .eq('id', jobId);

                                if (!error) {
                                  await fetchJobDetails();
                                  toast.success("Stage deleted successfully");
                                } else {
                                  toast.error("Failed to delete stage");
                                }
                              }}
                              onAdvanceCandidate={(candidate) => {
                                setSelectedCandidateForAction({ candidate, action: 'advance' });
                              }}
                              onRejectCandidate={(candidate) => {
                                setSelectedCandidateForAction({ candidate, action: 'decline' });
                              }}
                              onViewProfile={(candidate) => {
                                const candidateId = (candidate as any).candidate_id || (candidate as any).user_id;
                                if (!candidateId) {
                                  toast.error('Unable to load candidate profile');
                                  return;
                                }
                                navigate(`/candidate/${candidateId}?fromJob=${jobId}&stage=${encodeURIComponent(stage.name)}&stageIndex=${stage.order || 0}`);
                              }}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                </SectionErrorBoundary>
              </CardContent>
            </Card>

            {/* Team & Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <TeamActivityCard jobId={job.id} />

              <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl shadow-[var(--shadow-glass-md)] hover:shadow-[var(--shadow-glass-lg)] transition-all duration-300">
                <CardHeader>
                  <CardTitle className="font-black uppercase text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    Next Actions Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {metrics?.needsClubCheck ? (
                      <span className="font-bold">
                        {metrics.needsClubCheck} candidate{metrics.needsClubCheck !== 1 ? 's' : ''} need Club Check
                      </span>
                    ) : (
                      <span className="text-muted-foreground">All candidates reviewed</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

          </main>

          {/* Sidebar (Right - 30%) */}
          <aside className="order-first lg:order-last">
            <JobDashboardSidebar
              job={job}
              metrics={metrics}
              stages={stages}
              onEditJob={() => setEditDialogOpen(true)}
              onRefresh={fetchJobDetails}
            />
          </aside>
        </div>

        {/* Consolidated Tabs - Reduced from 8 to 3 */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm border-2 border-border/20 shadow-[var(--shadow-glass-sm)]">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background/60 data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all">
              Intelligence
            </TabsTrigger>
            {jobRole && (
              <TabsTrigger value="my-view" className="data-[state=active]:bg-background/60 data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all">
                <Target className="h-4 w-4 mr-1 inline" />
                My View
              </TabsTrigger>
            )}
            <TabsTrigger value="analytics" className="data-[state=active]:bg-background/60 data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-background/60 data-[state=active]:border-b-2 data-[state=active]:border-primary transition-all">
              Rejected ({rejectedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Predictive Analytics Widget */}
            <PredictiveAnalyticsDashboard jobId={job.id} />

            {/* ML Insights Widget */}
            <MLInsightsWidget jobId={job.id} />

            {/* Candidate Intelligence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Top Candidates Dossiers */}
              <Card className="border-2 border-border/40 backdrop-blur-xl bg-gradient-to-br from-card/90 to-card/60">
                <CardHeader>
                  <CardTitle className="font-black uppercase text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Top Candidate Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {applications
                    .filter(app => app.status === 'active')
                    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
                    .slice(0, 3)
                    .map(app => (
                      <CandidateIntelligenceDossier
                        key={app.id}
                        candidateId={app.candidate_id}
                        jobId={job.id}
                      />
                    ))}
                  {applications.filter(app => app.status === 'active').length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active candidates yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Right: Executive Briefings */}
              <Card className="border-2 border-border/40 backdrop-blur-xl bg-gradient-to-br from-card/90 to-card/60">
                <CardHeader>
                  <CardTitle className="font-black uppercase text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Decision-Ready Briefings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {applications
                    .filter(app => app.status === 'active')
                    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
                    .slice(0, 3)
                    .map(app => (
                      <ExecutiveBriefingCard
                        key={app.id}
                        candidateId={app.candidate_id}
                        jobId={job.id}
                        compact={false}
                      />
                    ))}
                  {applications.filter(app => app.status === 'active').length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active candidates yet
                    </p>
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
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center">
                    You don't have a specific role assigned for this job. Contact the hiring manager to get access.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-6">
            <JobAnalytics jobId={job.id} />
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-6">
            <RejectedCandidatesTab
              jobId={job.id}
              stages={stages}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Stage Dialog */}
      <AddStageDialog
        open={showAddStage}
        onOpenChange={(open) => {
          setShowAddStage(open);
          if (!open) {
            setEditingStage(null);
            setEditingStageIndex(null);
          }
        }}
        onSave={async (newStage) => {
          let updatedStages;
          if (editingStageIndex !== null) {
            updatedStages = stages.map((s, i) => i === editingStageIndex ? newStage : s);
          } else {
            updatedStages = [...stages, newStage];
          }

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


      {/* Candidate Action Dialog */}
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
            fetchJobDetails(); // This will refresh both metrics and rejected count
          }}
        />
      )}

      {/* Edit Job Sheet */}
      {job && (
        <EditJobSheet
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          job={job}
          onJobUpdated={fetchJobDetails}
        />
      )}

      {/* Manual Interview Entry Dialog */}
      <ManualInterviewEntryDialog
        open={showManualInterview}
        onOpenChange={setShowManualInterview}
        jobId={jobId}
        onInterviewAdded={fetchJobDetails}
      />

      {/* Calendar Interview Linker */}
      <CalendarInterviewLinker
        open={showCalendarLinker}
        onOpenChange={setShowCalendarLinker}
        jobId={jobId}
        applications={applications}
        onInterviewLinked={fetchJobDetails}
      />

      {/* Job Closure & Management Dialogs */}
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
    </AppLayout>
  );
}
