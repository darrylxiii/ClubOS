import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { JobProfileHero } from "@/components/jobs/JobProfileHero";
import { AboutRoleSection } from "@/components/jobs/AboutRoleSection";
import { JobDescriptionViewer } from "@/components/jobs/JobDescriptionViewer";
import { SkillMatrix } from "@/components/jobs/SkillMatrix";
import { ToolsShowcase } from "@/components/jobs/ToolsShowcase";
import { ResponsibilityGrid } from "@/components/jobs/ResponsibilityGrid";
import { BenefitsShowcase } from "@/components/jobs/BenefitsShowcase";
import { ApplicationTimeline } from "@/components/jobs/ApplicationTimeline";
import { CompanyShowcase } from "@/components/jobs/CompanyShowcase";
import { JobReferralSection } from "@/components/jobs/JobReferralSection";
import { EditJobSheet } from "@/components/partner/EditJobSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { canManageJob } from "@/utils/jobNavigation";
import { trackJobView, trackJobSave } from "@/services/analyticsTracking";
import { toast } from "sonner";
import { UnifiedLoader } from "@/components/ui/unified-loader";
import { ArrowLeft, Settings, Activity, Edit, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRole: role } = useRole();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
      checkUserStatus();

      // Phase 3: Track job view
      if (user) {
        trackJobView(user.id, jobId);
      }
    }
  }, [jobId, user]);

  // Separate effect for checking edit permissions after job loads
  useEffect(() => {
    if (job && user) {
      checkEditPermissions();
    }
  }, [job?.id, user?.id]);

  const loadJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          companies (
            name,
            slug,
            logo_url,
            cover_image_url,
            tagline,
            description,
            industry,
            company_size,
            headquarters_location,
            website_url
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
        .eq('id', jobId ?? '')
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error loading job:', error);
      toast.error('Failed to load job details');
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const checkUserStatus = async () => {
    if (!user || !jobId) return;

    try {
      // Check if user has applied
      const { data: appliedData } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle();

      setIsApplied(!!appliedData);

      // Check if job is saved
      const { data: savedData } = await supabase
        .from('saved_jobs')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle();

      setIsSaved(!!savedData);
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const checkEditPermissions = async () => {
    if (!user || !job) return;

    try {
      // Check if user is admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole) {
        setCanEdit(true);
        return;
      }

      // Check if user is partner/strategist for the same company
      const { data: partnerRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['partner', 'strategist'])
        .maybeSingle();

      if (partnerRole) {
        // Check if user is member of the job's company
        const { data: companyMember } = await supabase
          .from('company_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('company_id', job.company_id)
          .eq('is_active', true)
          .maybeSingle();

        setCanEdit(!!companyMember);
      }
    } catch (error) {
      console.error('Error checking edit permissions:', error);
    }
  };

  const handleApply = async () => {
    if (!user) {
      toast.error('Please sign in to apply');
      navigate('/auth');
      return;
    }

    if (isApplied) {
      toast.info('You have already applied to this job');
      return;
    }

    try {
      // Get the job's actual pipeline stages
      const pipelineStages = job?.pipeline_stages || [
        { name: 'Applied', order: 0 },
        { name: 'Screening', order: 1 },
        { name: 'Interview', order: 2 },
        { name: 'Offer', order: 3 }
      ];

      // Convert pipeline stages to application stages format
      const applicationStages = pipelineStages.map((stage: any, index: number) => ({
        id: stage.id || `stage-${index}`,
        name: stage.name,
        order: stage.order ?? index,
        status: index === 0 ? 'in_progress' : 'pending',
        started_at: index === 0 ? new Date().toISOString() : null,
        description: stage.description,
        duration_minutes: stage.duration_minutes,
        format: stage.format,
        owner: stage.owner,
        resources: stage.resources,
        location: stage.location,
        meeting_link: stage.meeting_link,
      }));

      const { error } = await supabase
        .from('applications')
        .insert([{
          user_id: user.id,
          job_id: jobId ?? '',
          position: job?.title || 'Position',
          company_name: job?.companies?.name || 'Company',
          status: 'active',
          current_stage_index: 0,
          stages: applicationStages,
        }]);

      if (error) throw error;

      setIsApplied(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Failed to submit application');
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please sign in to save jobs');
      navigate('/auth');
      return;
    }

    try {
      if (isSaved) {
        // Remove from database
        const { error } = await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', jobId ?? '');

        if (error) throw error;

        setIsSaved(false);
        toast.info('Job removed from saved jobs');
        trackJobSave(user.id, jobId!, false);
      } else {
        // Add to database
        const { error } = await supabase
          .from('saved_jobs')
          .insert([{ user_id: user.id, job_id: jobId ?? '' }]);

        if (error) throw error;

        setIsSaved(true);
        toast.success('Job saved successfully!');
        trackJobSave(user.id, jobId!, true);
      }
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('Failed to save job. Please try again.');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: job?.title,
          text: `Check out this job: ${job?.title} at ${job?.companies?.name}`,
          url,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <UnifiedLoader variant="page" showBranding />
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-muted-foreground">Job not found</p>
          <Button onClick={() => navigate('/jobs')}>Back to Jobs</Button>
        </div>
      </AppLayout>
    );
  }

  const daysOpen = Math.floor(
    (new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <AppLayout>
      <OceanBackgroundVideo />

      <div className="relative z-10 min-h-screen">
        {/* Top Navigation */}
        <div className="container mx-auto px-6 py-6 max-w-6xl">
          <div className="flex items-center justify-between">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Button variant="ghost" onClick={() => navigate('/jobs')} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Jobs
              </Button>
            </motion.div>

            {canEdit && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                {job.external_url && (
                  <Button
                    variant="outline"
                    asChild
                    className="gap-2"
                  >
                    <a href={job.external_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Original Posting
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsEditDialogOpen(true)} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Job
                </Button>
                {canManageJob(role) && (
                  <Button variant="outline" onClick={() => navigate(`/jobs/${jobId}/dashboard`)} className="gap-2">
                    <Settings className="w-4 h-4" />
                    Dashboard
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="container mx-auto px-6 max-w-6xl">
          <JobProfileHero
            job={{
              id: job.id,
              title: job.title,
              location: job.location,
              employment_type: job.employment_type,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              currency: job.currency,
              created_at: job.created_at,
              status: job.status,
              match_score: job.match_score,
              is_continuous: job.is_continuous,
              hired_count: job.hired_count,
              target_hire_count: job.target_hire_count,
            }}
            company={{
              name: job.companies?.name || 'Unknown Company',
              slug: job.companies?.slug,
              logo_url: job.companies?.logo_url,
              cover_image_url: job.companies?.cover_image_url,
              tagline: job.companies?.tagline,
            }}
            metrics={{
              applicants: job.applications_count || 0,
              views: job.views_count || 0,
              daysOpen: daysOpen,
            }}
            isSaved={isSaved}
            isApplied={isApplied}
            isAdmin={canManageJob(role)}
            onApply={handleApply}
            onSave={handleSave}
            onShare={handleShare}
          />
        </div>

        {/* Tab Navigation and Content */}
        <div className="container mx-auto px-6 py-6 max-w-6xl space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
              {canManageJob(role) && (
                <TabsTrigger value="activity">Activity</TabsTrigger>
              )}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <AboutRoleSection description={job.description} />

              <JobDescriptionViewer
                documentUrl={job.job_description_url}
                jobTitle={job.title}
                companyName={job.companies?.name || "Company"}
              />

              <ToolsShowcase
                requiredTools={job.job_tools?.filter((jt: any) => jt.is_required).map((jt: any) => jt.tools_and_skills) || []}
                niceToHaveTools={job.job_tools?.filter((jt: any) => !jt.is_required).map((jt: any) => jt.tools_and_skills) || []}
              />

              {job.responsibilities && job.responsibilities.length > 0 && (
                <Card className="border-2">
                  <CardHeader>
                    <h3 className="text-xl font-black">Key Responsibilities</h3>
                    <p className="text-sm text-muted-foreground">Main areas you'll be working on</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {job.responsibilities.slice(0, 5).map((responsibility: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-foreground/90">{responsibility}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {job.benefits && job.benefits.length > 0 && (
                <Card className="border-2">
                  <CardHeader>
                    <h3 className="text-xl font-black">Top Benefits</h3>
                    <p className="text-sm text-muted-foreground">What we offer</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {job.benefits.slice(0, 5).map((benefit: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-primary mt-1">✓</span>
                          <span className="text-foreground/90">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Referral Section */}
              <JobReferralSection
                jobId={job.id}
                jobTitle={job.title}
                companyName={job.companies?.name || 'Company'}
                salaryMin={job.salary_min}
                salaryMax={job.salary_max}
                feePercentage={job.companies?.placement_fee_percentage || 20}
                referralBonusPercentage={job.referral_bonus_percentage || 10}
                showReferralBonus={job.show_referral_bonus !== false}
              />
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-6">
              <SkillMatrix
                mustHaveSkills={job.requirements}
                niceToHaveSkills={job.nice_to_have}
              />
              <ResponsibilityGrid responsibilities={job.responsibilities} />
              <BenefitsShowcase benefits={job.benefits} />
              <ApplicationTimeline
                jobPipelineStages={job.pipeline_stages}
                currentStage={isApplied ? 0 : undefined}
              />
            </TabsContent>

            {/* Company Tab */}
            <TabsContent value="company" className="space-y-6 mt-6">
              {job.companies && (
                <CompanyShowcase company={job.companies} />
              )}
            </TabsContent>

            {/* Activity Tab (Admin Only) */}
            {canManageJob(role) && (
              <TabsContent value="activity" className="space-y-6 mt-6">
                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Activity className="w-6 h-6 text-primary" />
                      <div>
                        <h3 className="text-xl font-black">Job Analytics</h3>
                        <p className="text-sm text-muted-foreground">Performance metrics and insights</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-card/50 border">
                        <p className="text-2xl font-bold">24</p>
                        <p className="text-xs text-muted-foreground">Total Applications</p>
                      </div>
                      <div className="p-4 rounded-lg bg-card/50 border">
                        <p className="text-2xl font-bold">156</p>
                        <p className="text-xs text-muted-foreground">Total Views</p>
                      </div>
                      <div className="p-4 rounded-lg bg-card/50 border">
                        <p className="text-2xl font-bold">6.5%</p>
                        <p className="text-xs text-muted-foreground">Conversion Rate</p>
                      </div>
                      <div className="p-4 rounded-lg bg-card/50 border">
                        <p className="text-2xl font-bold">{daysOpen}d</p>
                        <p className="text-xs text-muted-foreground">Days Active</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Edit Job Sheet */}
      {canEdit && job && (
        <EditJobSheet
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          job={job}
          onJobUpdated={loadJobDetails}
        />
      )}
    </AppLayout>
  );
}
