import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { JobHero } from "@/components/jobs/JobHero";
import { JobDetailsSection } from "@/components/jobs/JobDetailsSection";
import { Button } from "@/components/ui/button";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { canManageJob } from "@/utils/jobNavigation";
import { toast } from "sonner";
import { ArrowLeft, Settings, Loader2 } from "lucide-react";

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
      checkUserStatus();
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
      // Check if applied
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

    // Toggle saved state (using local state for now)
    setIsSaved(!isSaved);
    
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
        // User cancelled or error occurred
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
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
      
      <div className="relative z-10 min-h-screen pb-16">
        {/* Navigation Header */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/jobs')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Button>

            {canManageJob(role) && (
              <Button
                variant="outline"
                onClick={() => navigate(`/jobs/${jobId}/dashboard`)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Manage Job
              </Button>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <JobHero
          title={job.title}
          company={{
            name: job.companies?.name || 'Unknown Company',
            slug: job.companies?.slug,
            logo_url: job.companies?.logo_url,
            cover_image_url: job.companies?.cover_image_url,
          }}
          location={job.location}
          employment_type={job.employment_type}
          salary_min={job.salary_min}
          salary_max={job.salary_max}
          currency={job.currency}
          matchScore={job.match_score}
          isSaved={isSaved}
          isApplied={isApplied}
          onApply={handleApply}
          onSave={handleSave}
          onShare={handleShare}
        />

        {/* Job Details */}
        <div className="container mx-auto px-4 py-8">
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

        {/* Sticky Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 p-4">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <h3 className="font-bold">{job.title}</h3>
              <p className="text-sm text-muted-foreground">{job.companies?.name}</p>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                onClick={handleSave}
                variant="outline"
                className="gap-2"
              >
                {isSaved ? 'Saved' : 'Save'}
              </Button>
              <Button
                onClick={handleApply}
                disabled={isApplied}
                className="gap-2"
              >
                {isApplied ? 'Applied' : 'Apply Now'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
