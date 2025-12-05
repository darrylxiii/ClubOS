import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  LayoutDashboard,
  MoreVertical,
  UserPlus,
  Download,
  HeadphonesIcon,
  BarChart3,
  Zap,
  Clock,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Briefcase,
  Target,
  Calendar,
  Award,
  BookOpen,
  Bell,
  FileText,
  Info,
  Sparkles,
  Timer,
  Flag,
  PlayCircle,
  Settings,
  Shield,
  Globe,
  Brain,
  Activity,
  Lock,
  Building2,
  RefreshCw,
  EyeOff,
  Archive,
  RotateCcw,
} from "lucide-react";
import { CreateJobDialog } from "./CreateJobDialog";
import { useUserRole } from "@/hooks/useUserRole";
import confetti from "canvas-confetti";
import { JobCardMetrics } from "./job-card/JobCardMetrics";
import { JobCardLastActivity } from "./job-card/JobCardLastActivity";
import { JobCardActions } from "./job-card/JobCardActions";
import { JobCardHeader } from "./job-card/JobCardHeader";
import { JobsAnalyticsWidget } from "./JobsAnalyticsWidget";
import { JobFilterBar, JobFilterType } from "./JobFilterBar";
import { formatLastActivity } from "@/lib/jobUtils";
import { JobSearchBar } from "./JobSearchBar";
import { AdvancedJobFilters } from "./AdvancedJobFilters";
import { usePersistedJobFilters } from "@/hooks/usePersistedJobFilters";
import { JobFilterState } from "@/types/jobFilters";
import { JobStatusSummaryBar, JobStatusFilter } from "./JobStatusSummaryBar";

interface PartnerJobsHomeProps {
  companyId: string | null;
}

interface JobWithMetrics {
  id: string;
  title: string;
  status: string;
  location: string;
  created_at: string;
  club_sync_status: 'accepted' | 'pending' | 'not_offered' | null;
  candidate_count: number;
  active_stage_count: number;
  last_activity: string | null;
  last_activity_user: { name: string; avatar: string | null } | null;
  days_since_opened: number;
  conversion_rate: number | null;
  company_name: string;
  company_logo: string | null;
  is_stealth: boolean;
  is_continuous: boolean;
  hired_count: number;
  target_hire_count: number | null;
}

interface CompanyMetrics {
  activeSearches: number;
  totalCandidates: number;
  avgTimeToHire: number | null;
  conversionRate: number | null;
  clubSyncActive: number;
  pendingActions: number;
}

export const PartnerJobsHome = ({ companyId }: PartnerJobsHomeProps) => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [jobs, setJobs] = useState<JobWithMetrics[]>([]);
  const [companyMetrics, setCompanyMetrics] = useState<CompanyMetrics>({
    activeSearches: 0,
    totalCandidates: 0,
    avgTimeToHire: null,
    conversionRate: null,
    clubSyncActive: 0,
    pendingActions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [clubSyncInfoOpen, setClubSyncInfoOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>('all');
  const [isPublishingAll, setIsPublishingAll] = useState(false);
  const isAdmin = role === 'admin';
  
  // Use persisted filters
  const { filters, updateFilters, resetFilters, hasActiveFilters } = usePersistedJobFilters();

  useEffect(() => {
    // Check if first visit
    const hasVisited = localStorage.getItem('partner_hq_visited');
    if (!hasVisited) {
      setIsFirstVisit(true);
      setWelcomeModalOpen(true);
      localStorage.setItem('partner_hq_visited', 'true');
    }
  }, []);

  useEffect(() => {
    fetchJobsWithMetrics();
  }, [companyId, role]);

  const fetchJobsWithMetrics = useCallback(async () => {
    try {
      // Fetch jobs with company info - admins see all jobs, partners see only their company's jobs
      let query = supabase
        .from('jobs')
        .select(`
          id, 
          title, 
          status, 
          location, 
          created_at,
          company_id,
          club_sync_status,
          is_stealth,
          is_continuous,
          hired_count,
          target_hire_count,
          companies (
            name,
            logo_url
          )
        `);
      
      if (role !== 'admin' && companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data: jobsData, error: jobsError } = await query
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch all applications for these jobs with user info
      const jobIds = (jobsData || []).map(j => j.id.toString());
      const { data: applicationsData } = await supabase
        .from('applications')
        .select(`
          id, 
          job_id, 
          current_stage_index, 
          stages, 
          updated_at,
          user_id,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .in('job_id', jobIds);

      // Group applications by job_id
      const applicationsByJob = (applicationsData || []).reduce((acc: any, app: any) => {
        if (!acc[app.job_id]) acc[app.job_id] = [];
        acc[app.job_id].push(app);
        return acc;
      }, {});

      // Transform data with metrics
      const jobsWithMetrics: JobWithMetrics[] = (jobsData || []).map((job: any) => {
        const applications = applicationsByJob[job.id.toString()] || [];
        const candidateCount = applications.length;
        
        // Count active candidates (not rejected/withdrawn)
        const activeStageCount = applications.filter((app: any) => {
          const stages = app.stages || [];
          const currentStage = stages[app.current_stage_index];
          return currentStage && !['rejected', 'withdrawn'].includes(currentStage.status?.toLowerCase());
        }).length;

        // Get most recent activity with user info
        let lastActivity = null;
        let lastActivityUser = null;
        
        if (applications.length > 0) {
          const mostRecentApp = applications.reduce((latest: any, app: any) => {
            return !latest || app.updated_at > latest.updated_at ? app : latest;
          }, null);
          
          lastActivity = mostRecentApp.updated_at;
          lastActivityUser = mostRecentApp.profiles ? {
            name: mostRecentApp.profiles.full_name || 'Unknown User',
            avatar: mostRecentApp.profiles.avatar_url || null
          } : null;
        }

        // Calculate days since job was opened
        const daysSinceOpened = Math.floor(
          (new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate conversion rate (hired / total applied)
        const hiredApps = applications.filter((app: any) => {
          const stages = app.stages || [];
          return stages.some((s: any) => s.status?.toLowerCase() === 'hired');
        });
        const conversionRate = candidateCount > 0
          ? Math.round((hiredApps.length / candidateCount) * 100)
          : null;

        return {
          id: job.id,
          title: job.title,
          status: job.status,
          location: job.location || 'Remote',
          created_at: job.created_at,
          club_sync_status: job.club_sync_status || 'not_offered',
          candidate_count: candidateCount,
          active_stage_count: activeStageCount,
          last_activity: lastActivity,
          last_activity_user: lastActivityUser,
          days_since_opened: daysSinceOpened,
          conversion_rate: conversionRate,
          company_name: job.companies?.name || 'Unknown Company',
          company_logo: job.companies?.logo_url || null,
          is_stealth: job.is_stealth || false,
          is_continuous: job.is_continuous || false,
          hired_count: job.hired_count || 0,
          target_hire_count: job.target_hire_count,
        };
      });

      setJobs(jobsWithMetrics);

      // Calculate company-wide metrics
      const activeJobs = jobsWithMetrics.filter(j => j.status === 'published').length;
      const totalCandidates = jobsWithMetrics.reduce((sum, j) => sum + j.candidate_count, 0);
      const clubSyncCount = jobsWithMetrics.filter(j => j.club_sync_status === 'accepted').length;
      
      const allDaysOpen = jobsWithMetrics.map(j => j.days_since_opened);
      const avgCompanyTimeToHire = allDaysOpen.length > 0
        ? Math.round(allDaysOpen.reduce((sum, t) => sum + t, 0) / allDaysOpen.length)
        : null;

      const allConversions = jobsWithMetrics
        .map(j => j.conversion_rate)
        .filter(c => c !== null) as number[];
      const avgCompanyConversion = allConversions.length > 0
        ? Math.round(allConversions.reduce((sum, c) => sum + c, 0) / allConversions.length)
        : null;

      // Calculate pending actions (simplified)
      const pendingActions = jobsWithMetrics.reduce((sum, j) => sum + j.active_stage_count, 0);

      setCompanyMetrics({
        activeSearches: activeJobs,
        totalCandidates,
        avgTimeToHire: avgCompanyTimeToHire,
        conversionRate: avgCompanyConversion,
        clubSyncActive: clubSyncCount,
        pendingActions,
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [companyId, role]);

  // Extract unique companies for filter
  const availableCompanies = useMemo(() => {
    const uniqueCompanies = new Map<string, string>();
    jobs.forEach(job => {
      if (job.company_name) {
        // Use job.id as company identifier for now (we'd need company_id in future)
        uniqueCompanies.set(job.company_name, job.company_name);
      }
    });
    return Array.from(uniqueCompanies.entries()).map(([id, name]) => ({ id, name }));
  }, [jobs]);

  // Apply all filters
  const filteredJobs = useMemo(() => {
    let filtered = [...jobs];
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchLower) ||
        job.company_name.toLowerCase().includes(searchLower) ||
        job.location.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(job => 
        filters.status.includes(job.status.toLowerCase())
      );
    }
    
    // Apply company filter
    if (filters.companies.length > 0) {
      filtered = filtered.filter(job => 
        filters.companies.includes(job.company_name)
      );
    }
    
    // Apply date range filter
    if (filters.dateRange.from) {
      filtered = filtered.filter(job => 
        new Date(job.created_at) >= filters.dateRange.from!
      );
    }
    if (filters.dateRange.to) {
      const toDate = new Date(filters.dateRange.to);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      filtered = filtered.filter(job => 
        new Date(job.created_at) <= toDate
      );
    }
    
    // Apply quick filter
    switch (filters.quickFilter) {
      case 'expiring-soon':
        // Jobs open for 45+ days
        filtered = filtered.filter(job => job.days_since_opened >= 45);
        filtered.sort((a, b) => b.days_since_opened - a.days_since_opened);
        break;
      case 'recent-activity':
        // Jobs with activity in last 7 days
        filtered = filtered.filter(job => {
          if (!job.last_activity) return false;
          const daysSince = Math.floor(
            (new Date().getTime() - new Date(job.last_activity).getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysSince <= 7;
        });
        filtered.sort((a, b) => {
          const dateA = a.last_activity ? new Date(a.last_activity).getTime() : 0;
          const dateB = b.last_activity ? new Date(b.last_activity).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'high-engagement':
        // Jobs with conversion rate >= 15% or many candidates
        filtered = filtered.filter(job => 
          (job.conversion_rate && job.conversion_rate >= 15) || 
          job.candidate_count >= 10
        );
        filtered.sort((a, b) => (b.conversion_rate || 0) - (a.conversion_rate || 0));
        break;
      default:
        // All jobs, sorted by most recent first
        filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
    
    return filtered;
  }, [jobs, filters]);

  // Calculate filter counts (for quick filter badges)
  const jobCounts = useMemo(() => {
    const expiringSoon = jobs.filter(job => job.days_since_opened >= 45).length;
    const recentActivity = jobs.filter(job => {
      if (!job.last_activity) return false;
      const daysSince = Math.floor(
        (new Date().getTime() - new Date(job.last_activity).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSince <= 7;
    }).length;
    const highEngagement = jobs.filter(job => 
      (job.conversion_rate && job.conversion_rate >= 15) || job.candidate_count >= 10
    ).length;
    
    return {
      all: jobs.length,
      expiringSoon,
      recentActivity,
      highEngagement
    };
  }, [jobs]);

  // Calculate status counts for status summary bar
  const statusCounts = useMemo(() => ({
    all: jobs.length,
    draft: jobs.filter(j => j.status === 'draft').length,
    published: jobs.filter(j => j.status === 'published').length,
    closed: jobs.filter(j => j.status === 'closed').length,
    archived: jobs.filter(j => j.status === 'archived').length,
  }), [jobs]);

  // Apply status filter on top of other filters
  const statusFilteredJobs = useMemo(() => {
    if (statusFilter === 'all') return filteredJobs;
    return filteredJobs.filter(job => job.status === statusFilter);
  }, [filteredJobs, statusFilter]);
  
  // Handler for quick filter change
  const handleQuickFilterChange = (filter: JobFilterType) => {
    updateFilters({ quickFilter: filter });
  };

  const handlePublishJob = async (jobId: string, jobTitle: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;

      toast.success(`${jobTitle} is now live!`, {
        description: "Candidates can now see and apply to this job"
      });
      fetchJobsWithMetrics();
      celebrateAction();
    } catch (error) {
      console.error('Error publishing job:', error);
      toast.error("Failed to publish job");
    }
  };

  const handleUnpublishJob = async (jobId: string, jobTitle: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'draft' })
        .eq('id', jobId);

      if (error) throw error;

      toast.success(`${jobTitle} moved to draft`);
      fetchJobsWithMetrics();
    } catch (error) {
      console.error('Error unpublishing job:', error);
      toast.error("Failed to unpublish job");
    }
  };

  const handleCloseJob = async (jobId: string, jobTitle: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'closed' })
        .eq('id', jobId);

      if (error) throw error;

      toast.success(`${jobTitle} has been closed`);
      fetchJobsWithMetrics();
    } catch (error) {
      console.error('Error closing job:', error);
      toast.error("Failed to close job");
    }
  };

  const handleReopenJob = async (jobId: string, jobTitle: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'published' })
        .eq('id', jobId);

      if (error) throw error;

      toast.success(`${jobTitle} has been reopened`);
      fetchJobsWithMetrics();
      celebrateAction();
    } catch (error) {
      console.error('Error reopening job:', error);
      toast.error("Failed to reopen job");
    }
  };

  const handleArchiveJob = async (jobId: string, jobTitle: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'archived' })
        .eq('id', jobId);

      if (error) throw error;

      toast.success(`${jobTitle} has been archived`);
      fetchJobsWithMetrics();
    } catch (error) {
      console.error('Error archiving job:', error);
      toast.error("Failed to archive job");
    }
  };

  const handleRestoreJob = async (jobId: string, jobTitle: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'closed' })
        .eq('id', jobId);

      if (error) throw error;

      toast.success(`${jobTitle} has been restored from archive`);
      fetchJobsWithMetrics();
    } catch (error) {
      console.error('Error restoring job:', error);
      toast.error("Failed to restore job");
    }
  };

  const handlePublishAllDrafts = async () => {
    setIsPublishingAll(true);
    try {
      const draftJobs = jobs.filter(j => j.status === 'draft');
      
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .in('id', draftJobs.map(j => j.id));

      if (error) throw error;

      toast.success(`Published ${draftJobs.length} job${draftJobs.length !== 1 ? 's' : ''} successfully!`);
      fetchJobsWithMetrics();
      celebrateAction();
    } catch (error) {
      console.error('Error publishing all drafts:', error);
      toast.error("Failed to publish all drafts");
    } finally {
      setIsPublishingAll(false);
    }
  };

  const handleClubSyncAction = async (jobId: string, action: 'accept' | 'decline') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (action === 'accept') {
        // Create Club Sync request
        const { data: request, error: requestError } = await supabase
          .from('club_sync_requests')
          .insert({
            job_id: jobId,
            requested_by: user.id,
            status: 'pending',
            notes: 'Partner requested Club Sync activation',
          })
          .select()
          .single();

        if (requestError) throw requestError;

        // Update job status to pending
        const { error: jobError } = await supabase
          .from('jobs')
          .update({ club_sync_status: 'pending' })
          .eq('id', jobId);

        if (jobError) throw jobError;

        // Send notification to admins
        await supabase.functions.invoke('notify-club-sync-request', {
          body: {
            requestId: request.id,
            action: 'created',
          },
        });

        toast.success('Club Sync requested', {
          description: 'Your request has been sent to The Quantum Club team for review',
        });
      } else {
        // Decline Club Sync
        const { error } = await supabase
          .from('jobs')
          .update({ club_sync_status: 'declined' })
          .eq('id', jobId);

        if (error) throw error;

        toast.success('Club Sync declined for this role');
      }

      fetchJobsWithMetrics();
    } catch (error) {
      console.error('Error handling Club Sync action:', error);
      toast.error('Failed to process Club Sync request');
    }
  };

  const handleQuickAction = (action: string, jobId: string, jobTitle: string) => {
    switch (action) {
      case 'invite':
        toast.info(`Invite candidates feature coming soon for ${jobTitle}`);
        break;
      case 'export':
        toast.info(`Export pipeline feature coming soon for ${jobTitle}`);
        break;
      case 'support':
        toast.info(`Club support request feature coming soon for ${jobTitle}`);
        break;
      case 'analytics':
        navigate(`/jobs/${jobId}/dashboard`);
        break;
    }
  };

  const getClubSyncBadge = (status: string | null) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />Club Sync Active</Badge>;
      case 'pending':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Pending Approval</Badge>;
      case 'not_offered':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Not Active</Badge>;
      default:
        return null;
    }
  };

  const formatLastActivity = (date: string | null) => {
    if (!date) return 'No activity';
    const daysAgo = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    return `${daysAgo} days ago`;
  };

  const celebrateAction = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-2">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Jobs Grid Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-2">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Video */}
      <div className="fixed inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source src="/videos/ocean-background.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background/95" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <TooltipProvider>
          {/* Welcome Modal */}
      <Dialog open={welcomeModalOpen} onOpenChange={setWelcomeModalOpen}>
        <DialogContent className="sm:max-w-lg glass-card">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 text-white" />
              <DialogTitle className="text-2xl">Welcome to Your Hiring HQ</DialogTitle>
            </div>
            <DialogDescription className="text-base space-y-4 pt-4">
              <p>Your exclusive command center for world-class hiring. Here's what you can do:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                  <span><strong>Track live metrics</strong> across all your searches</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                  <span><strong>Activate Club Sync</strong> for vetted, premium candidates 3x faster</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                  <span><strong>Manage your pipeline</strong> with advanced analytics and insights</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                  <span><strong>Get white-glove support</strong> from the Quantum Club team</span>
                </li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => setWelcomeModalOpen(false)} variant="outline" className="flex-1">
              Explore on My Own
            </Button>
            <Button 
              onClick={() => {
                setWelcomeModalOpen(false);
                setCreateDialogOpen(true);
              }} 
              className="flex-1 gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Job
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Club Sync Info Modal */}
      <Dialog open={clubSyncInfoOpen} onOpenChange={setClubSyncInfoOpen}>
        <DialogContent className="sm:max-w-md glass-card">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-white" />
              <DialogTitle className="text-xl">What's Club Sync?</DialogTitle>
            </div>
            <DialogDescription className="text-base space-y-4 pt-4">
              <p className="font-semibold text-foreground">Your premium hiring accelerator.</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/20 border border-border/20">
                  <TrendingUp className="w-5 h-5 text-white mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">3x Faster Hiring</p>
                    <p className="text-sm text-muted-foreground">Get vetted candidates in days, not weeks</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/20 border border-border/20">
                  <Award className="w-5 h-5 text-white mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Pre-Vetted Talent</p>
                    <p className="text-sm text-muted-foreground">Every candidate is Club-verified for quality</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/20 border border-border/20">
                  <HeadphonesIcon className="w-5 h-5 text-white mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Dedicated Support</p>
                    <p className="text-sm text-muted-foreground">Personal recruiter assistance included</p>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setClubSyncInfoOpen(false)} className="w-full">
            Got It
          </Button>
        </DialogContent>
      </Dialog>


      {/* Header */}
      <div className="space-y-6 mb-8">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-caps text-muted-foreground mb-2">
              {isAdmin ? "Platform Overview" : "Your Hiring HQ"}
            </p>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">
              {isAdmin ? "All Active Searches" : "Active Searches"}
            </h1>
            {isAdmin && (
              <p className="text-sm text-muted-foreground mt-2">
                {companyId ? "Viewing specific company" : "Cross-company view"}
              </p>
            )}
          </div>
          
          {/* Action Buttons - Responsive Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Button 
              variant="glass"
              className="gap-2 h-auto py-4 px-4 flex-col items-start justify-start text-left"
              onClick={() => navigate('/company-applications')}
            >
              <LayoutDashboard className="w-5 h-5 mb-1" />
              <span className="text-sm font-semibold">Applications Hub</span>
            </Button>
            
            <Button 
              variant="glass"
              className="gap-2 h-auto py-4 px-4 flex-col items-start justify-start text-left"
              onClick={() => navigate('/company-jobs')}
            >
              <Settings className="w-5 h-5 mb-1" />
              <span className="text-sm font-semibold">Company Settings</span>
            </Button>
            
            {isAdmin ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="glass"
                    className="gap-2 h-auto py-4 px-4 flex-col items-start justify-start text-left"
                  >
                    <Shield className="w-5 h-5 mb-1" />
                    <span className="text-sm font-semibold">Admin Tools</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 bg-card/95 backdrop-blur-xl border-border/20">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-white" />
                    Platform Administration
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => navigate('/admin/companies')} className="gap-2">
                    <Building2 className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-medium">Company Management</p>
                      <p className="text-xs text-muted-foreground">View & manage all partners</p>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="gap-2">
                    <Globe className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-medium">Bulk Operations</p>
                      <p className="text-xs text-muted-foreground">Cross-job actions at scale</p>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate('/admin/ai-config')} className="gap-2">
                    <Brain className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-medium">AI Model Config</p>
                      <p className="text-xs text-muted-foreground">Tune matching algorithms</p>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => navigate('/admin/club-sync-requests')} className="gap-2">
                    <Zap className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-medium">Club Sync Requests</p>
                      <p className="text-xs text-muted-foreground">Review partner requests</p>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="gap-2">
                    <Activity className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-medium">System Health</p>
                      <p className="text-xs text-muted-foreground">Platform status & uptime</p>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="gap-2">
                    <Lock className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-medium">Access Control</p>
                      <p className="text-xs text-muted-foreground">Roles & permissions</p>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate('/admin/analytics')} className="gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-medium">Global Analytics</p>
                      <p className="text-xs text-muted-foreground">Cross-company insights</p>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={fetchJobsWithMetrics} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="font-medium">Refresh Metrics</p>
                      <p className="text-xs text-muted-foreground">Recalculate everything</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="glass"
                className="gap-2 h-auto py-4 px-4 flex-col items-start justify-start text-left"
              >
                <Users className="w-5 h-5 mb-1" />
                <span className="text-sm font-semibold">Invite Team</span>
              </Button>
            )}
            
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              variant="glass"
              className="gap-2 h-auto py-4 px-4 flex-col items-start justify-start text-left"
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-sm font-semibold">New Job</span>
            </Button>
          </div>
        </div>

        {/* Bento KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Active Searches - Larger emphasis */}
          <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:shadow-xl hover:border-border/40 transition-all sm:col-span-2 lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Briefcase className="w-6 h-6 text-foreground" />
                <Badge variant="outline" className="text-xs">Live</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black text-foreground">{companyMetrics.activeSearches}</p>
                <p className="text-sm font-medium text-muted-foreground">Active Searches</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Candidates */}
          <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:shadow-xl hover:border-border/40 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-5 h-5 text-foreground" />
                <Badge variant="outline" className="text-xs">Pipeline</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-foreground">{companyMetrics.totalCandidates}</p>
                <p className="text-sm text-muted-foreground">Candidates in Pipeline</p>
              </div>
            </CardContent>
          </Card>

          {/* Avg Time to Hire */}
          <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:shadow-xl hover:border-border/40 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Clock className="w-5 h-5 text-foreground" />
                <Badge variant="outline" className="text-xs">Speed</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-foreground">
                  {companyMetrics.avgTimeToHire !== null ? `${companyMetrics.avgTimeToHire}d` : '—'}
                </p>
                <p className="text-sm text-muted-foreground">Avg. Time-to-Hire</p>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:shadow-xl hover:border-border/40 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-5 h-5 text-foreground" />
                <Badge variant="outline" className="text-xs">Success</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-foreground">
                  {companyMetrics.conversionRate !== null ? `${companyMetrics.conversionRate}%` : '—'}
                </p>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
              </div>
            </CardContent>
          </Card>

          {/* Club Sync Status - Larger emphasis */}
          <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:shadow-xl hover:border-border/40 transition-all sm:col-span-2 lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-6 h-6 text-foreground" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => setClubSyncInfoOpen(true)}
                      >
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm">Get top-vetted candidates 3x faster with Club Sync</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Badge variant="outline" className="text-xs">Premium</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black text-foreground">{companyMetrics.clubSyncActive}</p>
                <p className="text-sm font-medium text-muted-foreground">Club Sync Active</p>
              </div>
              {companyMetrics.clubSyncActive < companyMetrics.activeSearches && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-3 text-xs gap-2"
                  onClick={() => toast.info("Contact your Quantum Club rep to activate Club Sync")}
                >
                  <Sparkles className="w-3 h-3" />
                  Enable {companyMetrics.activeSearches - companyMetrics.clubSyncActive} More
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:shadow-xl hover:border-border/40 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Bell className="w-5 h-5 text-foreground" />
                <Badge variant="outline" className="text-xs">Action</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-foreground">{companyMetrics.pendingActions}</p>
                <p className="text-sm text-muted-foreground">Pending Actions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Bar - Hidden */}
        {/*
        <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:border-border/40 transition-all">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-white" />
                <span className="font-semibold">Quick Actions</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-2 sm:pb-0">
                <Button variant="outline" size="sm" className="gap-2 relative">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Interviews</span>
                  {companyMetrics.pendingActions > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-background/40 text-white text-xs border border-border/20">
                      {companyMetrics.pendingActions}
                    </Badge>
                  )}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <HeadphonesIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Support</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-2 relative">
                  <Target className="w-4 h-4" />
                  <span className="hidden sm:inline">Vetted Talent</span>
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-background/40 text-white text-xs border border-border/20">
                    12
                  </Badge>
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Resources</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
        */}
      </div>

      {/* Search and Filters Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            All Jobs {jobs.length > 0 && `(${jobs.length})`}
          </h2>
        </div>
        
        {/* Status Summary Bar with Tabs and Bulk Actions */}
        <JobStatusSummaryBar
          counts={statusCounts}
          currentStatus={statusFilter}
          onStatusChange={setStatusFilter}
          onPublishAllDrafts={handlePublishAllDrafts}
          isPublishingAll={isPublishingAll}
        />
        
        {/* Search Bar */}
        <JobSearchBar
          value={filters.search}
          onChange={(value) => updateFilters({ search: value })}
          resultsCount={statusFilteredJobs.length}
          placeholder="Search by job title, company, or location..."
        />
        
        {/* Quick Filters */}
        <JobFilterBar
          currentFilter={filters.quickFilter}
          onFilterChange={handleQuickFilterChange}
          jobCounts={jobCounts}
        />
        
        {/* Advanced Filters */}
        <AdvancedJobFilters
          filters={filters}
          onFilterChange={updateFilters}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
          availableCompanies={availableCompanies}
        />
      </div>

      {/* Jobs Grid */}
      {jobs.length === 0 ? (
        <Card className="border-2 border-dashed border-border/40 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:border-border/60 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <Briefcase className="w-12 h-12 text-white mb-4" />
            <h3 className="text-2xl font-bold mb-2">Welcome to Your Hiring HQ</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Create your first job to unlock Club Sync, premium candidate matching, and world-class analytics
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button onClick={() => setWelcomeModalOpen(true)} variant="outline" size="lg" className="gap-2">
                <PlayCircle className="w-5 h-5" />
                Quick Tour
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                Create First Job
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {statusFilteredJobs.map((job) => (
            <MemoizedJobCard 
              key={job.id}
              job={job}
              onNavigate={(id) => navigate(`/jobs/${id}/dashboard`)}
              onPublish={handlePublishJob}
              onUnpublish={handleUnpublishJob}
              onClose={handleCloseJob}
              onReopen={handleReopenJob}
              onArchive={handleArchiveJob}
              onRestore={handleRestoreJob}
              onQuickAction={handleQuickAction}
              onClubSync={handleClubSyncAction}
              getClubSyncBadge={getClubSyncBadge}
            />
          ))}
        </div>
      )}

      <CreateJobDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        companyId={companyId || undefined}
        onJobCreated={fetchJobsWithMetrics}
      />
        </TooltipProvider>
      </div>
    </div>
  );
};

// Memoized Job Card Component for Performance
const MemoizedJobCard = memo(({ 
  job, 
  onNavigate, 
  onPublish,
  onUnpublish,
  onClose,
  onReopen,
  onArchive,
  onRestore,
  onQuickAction, 
  onClubSync,
  getClubSyncBadge 
}: any) => {
  return (
    <Card className="border border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass)] hover:shadow-xl hover:border-border/40 transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3">
          <JobCardHeader
            companyLogo={job.company_logo}
            companyName={job.company_name}
            title={job.title}
            status={job.status}
            clubSyncBadge={getClubSyncBadge(job.club_sync_status)}
            isStealth={job.is_stealth}
            isContinuous={job.is_continuous}
            hiredCount={job.hired_count}
            targetHireCount={job.target_hire_count}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              {/* Status Actions */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Status Actions</DropdownMenuLabel>
              {job.status === 'draft' && (
                <>
                  <DropdownMenuItem onClick={() => onPublish(job.id, job.title)}>
                    <Flag className="w-4 h-4 mr-2 text-success" />
                    Publish Job
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive(job.id, job.title)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Draft
                  </DropdownMenuItem>
                </>
              )}
              {job.status === 'published' && (
                <>
                  <DropdownMenuItem onClick={() => onUnpublish(job.id, job.title)}>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Unpublish to Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onClose(job.id, job.title)}>
                    <XCircle className="w-4 h-4 mr-2 text-warning" />
                    Close Job
                  </DropdownMenuItem>
                </>
              )}
              {job.status === 'closed' && (
                <>
                  <DropdownMenuItem onClick={() => onReopen(job.id, job.title)}>
                    <RefreshCw className="w-4 h-4 mr-2 text-success" />
                    Reopen Job
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive(job.id, job.title)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Job
                  </DropdownMenuItem>
                </>
              )}
              {job.status === 'archived' && (
                <DropdownMenuItem onClick={() => onRestore(job.id, job.title)}>
                  <RotateCcw className="w-4 h-4 mr-2 text-success" />
                  Restore from Archive
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Quick Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onQuickAction('invite', job.id, job.title)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Candidate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction('export', job.id, job.title)}>
                <Download className="w-4 h-4 mr-2" />
                Export Pipeline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction('support', job.id, job.title)}>
                <HeadphonesIcon className="w-4 h-4 mr-2" />
                Request Club Support
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onQuickAction('analytics', job.id, job.title)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Pipeline Health Check
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Club Sync Action */}
        {job.club_sync_status === 'pending' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg bg-card/20 backdrop-blur-sm border border-border/20 animate-fade-in">
            <Zap className="w-4 h-4 text-white" />
            <span className="text-sm font-medium flex-1">Club Sync Invitation</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onClubSync(job.id, 'decline')}
                className="flex-1 sm:flex-initial"
              >
                Decline
              </Button>
              <Button
                size="sm"
                variant="glass"
                className="font-semibold flex-1 sm:flex-initial"
                onClick={() => onClubSync(job.id, 'accept')}
              >
                Accept
              </Button>
            </div>
          </div>
        )}

        {job.club_sync_status === 'not_offered' && (
          <div className="p-3 rounded-lg bg-card/20 backdrop-blur-sm border border-border/20">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-white mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Activate Club Sync</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Get white-glove hiring service: vetted candidates, faster matches, better outcomes
                </p>
                <Button size="sm" variant="outline" className="text-xs">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <JobCardMetrics
          candidateCount={job.candidate_count}
          activeStageCount={job.active_stage_count}
          daysSinceOpened={job.days_since_opened}
          conversionRate={job.conversion_rate}
        />

        {/* Last Activity */}
        <JobCardLastActivity
          lastActivity={job.last_activity}
          lastActivityUser={job.last_activity_user}
        />

        {/* Primary CTA */}
        <JobCardActions onOpenDashboard={() => onNavigate(job.id)} />
      </CardContent>
    </Card>
  );
});

MemoizedJobCard.displayName = 'MemoizedJobCard';
