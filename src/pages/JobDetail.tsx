import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { JobProfileHero } from "@/components/jobs/JobProfileHero";
import { AboutRoleSection } from "@/components/jobs/AboutRoleSection";
import { JobDescriptionViewer } from "@/components/jobs/JobDescriptionViewer";
import { SkillMatrix } from "@/components/jobs/SkillMatrix";
import { ResponsibilityGrid } from "@/components/jobs/ResponsibilityGrid";
import { BenefitsShowcase } from "@/components/jobs/BenefitsShowcase";
import { ApplicationTimeline } from "@/components/jobs/ApplicationTimeline";
import { CompanyShowcase } from "@/components/jobs/CompanyShowcase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { canManageJob } from "@/utils/jobNavigation";
import { trackJobView, trackJobSave } from "@/services/analyticsTracking";
import { toast } from "sonner";
import { ArrowLeft, Settings, Loader2, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
          )
        `)
        .eq('id', jobId)
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
      const { data: appliedData } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .maybeSingle();

      setIsApplied(!!appliedData);
    } catch (error) {
      console.error('Error checking user status:', error);
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
      const { error } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          job_id: jobId,
          position: job?.title || 'Position',
          company_name: job?.companies?.name || 'Company',
          status: 'active',
          current_stage_index: 0,
          stages: [{
            name: 'Applied',
            status: 'in_progress',
            started_at: new Date().toISOString(),
          }],
        });

      if (error) throw error;

      setIsApplied(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Failed to submit application');
    }
  };

  const handleSave = () => {
    if (!user) {
      toast.error('Please sign in to save jobs');
      navigate('/auth');
      return;
    }

    setIsSaved(!isSaved);
    
    // Phase 3: Track job save
    if (jobId) {
      trackJobSave(user.id, jobId, !isSaved);
    }
    
    if (isSaved) {
      toast.info('Job removed from saved jobs');
    } else {
      toast.success('Job saved successfully!');
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
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
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

            {canManageJob(role) && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Button variant="outline" onClick={() => navigate(`/jobs/${jobId}/dashboard`)} className="gap-2">
                  <Settings className="w-4 h-4" />
                  Manage Job
                </Button>
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
            }}
            company={{
              name: job.companies?.name || 'Unknown Company',
              slug: job.companies?.slug,
              logo_url: job.companies?.logo_url,
              cover_image_url: job.companies?.cover_image_url,
              tagline: job.companies?.tagline,
            }}
            metrics={{
              applicants: 24,
              views: 156,
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
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-6">
              <SkillMatrix 
                mustHaveSkills={job.requirements}
                niceToHaveSkills={job.nice_to_have}
              />
              <ResponsibilityGrid responsibilities={job.responsibilities} />
              <BenefitsShowcase benefits={job.benefits} />
              <ApplicationTimeline />
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
    </AppLayout>
  );
}
