import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { JobDetailCard } from "@/components/jobs/JobDetailCard";
import { JobDetailsSection } from "@/components/jobs/JobDetailsSection";
import { Button } from "@/components/ui/button";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { canManageJob } from "@/utils/jobNavigation";
import { trackJobView, trackJobSave } from "@/services/analyticsTracking";
import { toast } from "sonner";
import { ArrowLeft, Settings, Loader2, Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  return (
    <AppLayout>
      <OceanBackgroundVideo />
      
      <div className="relative z-10 min-h-screen pb-32">
        <div className="container mx-auto px-4 py-6">
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

        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
          <JobDetailCard
            job={{
              title: job.title,
              location: job.location,
              employment_type: job.employment_type,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              currency: job.currency,
              created_at: job.created_at,
              description: job.description,
            }}
            company={{
              name: job.companies?.name || 'Unknown Company',
              slug: job.companies?.slug,
              logo_url: job.companies?.logo_url,
              cover_image_url: job.companies?.cover_image_url,
              website_url: job.companies?.website_url,
            }}
            matchScore={job.match_score}
            isSaved={isSaved}
            isApplied={isApplied}
            onApply={handleApply}
            onSave={handleSave}
            onShare={handleShare}
            metrics={{
              applicants: 24,
              views: 156,
              timeToHire: "~2 weeks"
            }}
          />

          <JobDetailsSection
            job={{
              description: job.description,
              requirements: job.requirements,
              nice_to_have: job.nice_to_have,
              benefits: job.benefits,
              responsibilities: job.responsibilities,
              tags: job.tags,
            }}
            company={job.companies}
            showCompanyInfo={true}
          />
        </div>

        <AnimatePresence>
          {isScrolled && (
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 frosted-glass border-t border-border/50 p-4 pb-safe"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ duration: 0.3 }}
            >
              <div className="container mx-auto flex items-center justify-between gap-4">
                <div className="hidden sm:flex items-center gap-3">
                  {job.companies?.logo_url && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/50">
                      <img src={job.companies.logo_url} alt={job.companies.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm">{job.title}</h3>
                    <p className="text-xs text-muted-foreground">{job.companies?.name}</p>
                  </div>
                </div>

                <div className="flex gap-2 ml-auto">
                  <Button onClick={handleSave} variant="outline" size="lg" className="gap-2">
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
                  </Button>
                  <Button onClick={handleApply} disabled={isApplied} size="lg">
                    {isApplied ? 'Applied' : 'Apply Now'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="md:hidden fixed bottom-20 right-4 z-40">
          <Button onClick={handleApply} disabled={isApplied} size="lg" className="rounded-full shadow-lg h-14 px-6">
            {isApplied ? 'Applied ✓' : 'Apply Now'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
