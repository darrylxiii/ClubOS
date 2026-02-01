import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { ClubSyncBadge } from "@/components/jobs/ClubSyncBadge";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  CheckCircle,
  Zap,
  TrendingUp,
  Award,
  HeadphonesIcon,
  Sparkles,
  Radio,
} from "lucide-react";
import { CreateJobDialog } from "./CreateJobDialog";
import { useRole } from "@/contexts/RoleContext";
import confetti from "canvas-confetti";
import { JobFilterType } from "./JobFilterBar";
import { usePersistedJobFilters } from "@/hooks/usePersistedJobFilters";
import { JobStatusFilter } from "./JobStatusSummaryBar";
import { JobBulkActionBar } from "./JobBulkActionBar";
import { usePersistedViewMode, ViewMode } from "./ViewModeSwitcher";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { JobKanbanView } from "./JobKanbanView";
import { JobTableView } from "./JobTableView";
import { JobListView } from "./JobListView";
import { useJobSelection } from "@/hooks/useJobSelection";
import { useJobsRealtime } from "@/hooks/useJobsRealtime";
import { useJobsKeyboardNav } from "@/hooks/useJobsKeyboardNav";
import { useSavedFilterPresets } from "@/hooks/useSavedFilterPresets";
import { cn } from "@/lib/utils";

// New compact components
import {
  JobsCompactHeader,
  JobsInlineStats,
  JobsAIBanner,
  JobsUnifiedFilterBar,
  CompactJobCard,
  QuickFilterType,
} from "./jobs";

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
  const { currentRole: role } = useRole();
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
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = role === 'admin';
  
  // Use persisted filters
  const { filters, updateFilters, resetFilters, hasActiveFilters } = usePersistedJobFilters();
  
  // Saved filter presets
  const { presets, addPreset, deletePreset } = useSavedFilterPresets();
  
  // View mode persistence
  const [viewMode, setViewMode] = usePersistedViewMode('grid');

  useEffect(() => {
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

      const applicationsByJob = (applicationsData || []).reduce((acc: any, app: any) => {
        if (!acc[app.job_id]) acc[app.job_id] = [];
        acc[app.job_id].push(app);
        return acc;
      }, {});

      const jobsWithMetrics: JobWithMetrics[] = (jobsData || []).map((job: any) => {
        const applications = applicationsByJob[job.id.toString()] || [];
        const candidateCount = applications.length;
        
        const activeStageCount = applications.filter((app: any) => {
          const stages = app.stages || [];
          const currentStage = stages[app.current_stage_index];
          return currentStage && !['rejected', 'withdrawn'].includes(currentStage.status?.toLowerCase());
        }).length;

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

        const daysSinceOpened = Math.floor(
          (new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

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

  const availableCompanies = useMemo(() => {
    const uniqueCompanies = new Map<string, string>();
    jobs.forEach(job => {
      if (job.company_name) {
        uniqueCompanies.set(job.company_name, job.company_name);
      }
    });
    return Array.from(uniqueCompanies.entries()).map(([id, name]) => ({ id, name }));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let filtered = [...jobs];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchLower) ||
        job.company_name.toLowerCase().includes(searchLower) ||
        job.location.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.status.length > 0) {
      filtered = filtered.filter(job => 
        filters.status.includes(job.status.toLowerCase())
      );
    }
    
    if (filters.companies.length > 0) {
      filtered = filtered.filter(job => 
        filters.companies.includes(job.company_name)
      );
    }
    
    if (filters.dateRange.from) {
      filtered = filtered.filter(job => 
        new Date(job.created_at) >= filters.dateRange.from!
      );
    }
    if (filters.dateRange.to) {
      const toDate = new Date(filters.dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(job => 
        new Date(job.created_at) <= toDate
      );
    }
    
    switch (filters.quickFilter) {
      case 'expiring-soon':
        filtered = filtered.filter(job => job.days_since_opened >= 45);
        filtered.sort((a, b) => b.days_since_opened - a.days_since_opened);
        break;
      case 'recent-activity':
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
        filtered = filtered.filter(job => 
          (job.conversion_rate && job.conversion_rate >= 15) || 
          job.candidate_count >= 10
        );
        filtered.sort((a, b) => (b.conversion_rate || 0) - (a.conversion_rate || 0));
        break;
      default:
        filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
    
    return filtered;
  }, [jobs, filters]);

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

  const statusCounts = useMemo(() => ({
    all: jobs.length,
    draft: jobs.filter(j => j.status === 'draft').length,
    published: jobs.filter(j => j.status === 'published').length,
    closed: jobs.filter(j => j.status === 'closed').length,
    archived: jobs.filter(j => j.status === 'archived').length,
  }), [jobs]);

  const statusFilteredJobs = useMemo(() => {
    if (statusFilter === 'all') return filteredJobs;
    return filteredJobs.filter(job => job.status === statusFilter);
  }, [filteredJobs, statusFilter]);

  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    toggleJob,
    toggleAll,
    clearSelection,
    isSelected,
  } = useJobSelection({ jobs: statusFilteredJobs });

  useJobsRealtime({
    companyId,
    enabled: true,
    onJobUpdate: useCallback((updatedJob: any) => {
      setJobs(prev => prev.map(j => j.id === updatedJob.id ? { ...j, ...updatedJob } : j));
    }, []),
    onJobInsert: useCallback(() => {
      fetchJobsWithMetrics();
    }, []),
    onJobDelete: useCallback((deletedJob: any) => {
      setJobs(prev => prev.filter(j => j.id !== deletedJob.id));
    }, []),
  });

  const { focusedIndex, focusedJobId, setFocusedIndex } = useJobsKeyboardNav({
    jobs: statusFilteredJobs,
    onNavigateToJob: (jobId) => navigate(`/jobs/${jobId}/dashboard`),
    onPublishJob: (jobId) => {
      const job = statusFilteredJobs.find(j => j.id === jobId);
      if (job && job.status === 'draft') {
        handlePublishJob(jobId, job.title);
      }
    },
    onCloseJob: (jobId) => {
      const job = statusFilteredJobs.find(j => j.id === jobId);
      if (job && job.status === 'published') {
        handleCloseJob(jobId, job.title);
      }
    },
    onToggleSelect: toggleJob,
    onSelectAll: toggleAll,
    onFocusSearch: () => searchInputRef.current?.focus(),
    onShowHelp: () => setShortcutsDialogOpen(true),
    enabled: !loading,
  });

  // Bulk action handlers
  const handleBulkPublish = async () => {
    setIsBulkProcessing(true);
    try {
      const draftJobs = statusFilteredJobs.filter(j => selectedIds.has(j.id) && j.status === 'draft');
      if (draftJobs.length === 0) {
        toast.info("No draft jobs selected to publish");
        return;
      }
      
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .in('id', draftJobs.map(j => j.id));

      if (error) throw error;
      toast.success(`Published ${draftJobs.length} job(s)`);
      clearSelection();
      fetchJobsWithMetrics();
      celebrateAction();
    } catch (error) {
      console.error('Error bulk publishing:', error);
      toast.error("Failed to publish selected jobs");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkClose = async () => {
    setIsBulkProcessing(true);
    try {
      const publishedJobs = statusFilteredJobs.filter(j => selectedIds.has(j.id) && j.status === 'published');
      if (publishedJobs.length === 0) {
        toast.info("No published jobs selected to close");
        return;
      }
      
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'closed' })
        .in('id', publishedJobs.map(j => j.id));

      if (error) throw error;
      toast.success(`Closed ${publishedJobs.length} job(s)`);
      clearSelection();
      fetchJobsWithMetrics();
    } catch (error) {
      console.error('Error bulk closing:', error);
      toast.error("Failed to close selected jobs");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkArchive = async () => {
    setIsBulkProcessing(true);
    try {
      const archivableJobs = statusFilteredJobs.filter(j => selectedIds.has(j.id) && j.status !== 'archived');
      if (archivableJobs.length === 0) {
        toast.info("No jobs selected to archive");
        return;
      }
      
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'archived' })
        .in('id', archivableJobs.map(j => j.id));

      if (error) throw error;
      toast.success(`Archived ${archivableJobs.length} job(s)`);
      clearSelection();
      fetchJobsWithMetrics();
    } catch (error) {
      console.error('Error bulk archiving:', error);
      toast.error("Failed to archive selected jobs");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkExport = () => {
    toast.info(`Exporting ${selectedCount} jobs... (Coming soon)`);
  };
  
  const handleQuickFilterChange = (filter: QuickFilterType) => {
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

  const celebrateAction = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
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
      <div className="relative z-10 p-4 md:p-6 space-y-4">
        <TooltipProvider>
          {/* Welcome Modal */}
          <Dialog open={welcomeModalOpen} onOpenChange={setWelcomeModalOpen}>
            <DialogContent className="sm:max-w-lg glass-card">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <DialogTitle className="text-2xl">Welcome to Your Hiring HQ</DialogTitle>
                </div>
                <DialogDescription className="text-base space-y-4 pt-4">
                  <p>Your exclusive command center for world-class hiring. Here's what you can do:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Track live metrics</strong> across all your searches</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Activate Club Sync</strong> for vetted, premium candidates 3x faster</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span><strong>Manage your pipeline</strong> with advanced analytics and insights</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
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
                  <Zap className="w-6 h-6 text-primary" />
                  <DialogTitle className="text-xl">What's Club Sync?</DialogTitle>
                </div>
                <DialogDescription className="text-base space-y-4 pt-4">
                  <p className="font-semibold text-foreground">Your premium hiring accelerator.</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/20 border border-border/20">
                      <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">3x Faster Hiring</p>
                        <p className="text-sm text-muted-foreground">Get vetted candidates in days, not weeks</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/20 border border-border/20">
                      <Award className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">Pre-Vetted Talent</p>
                        <p className="text-sm text-muted-foreground">Every candidate is Club-verified for quality</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background/20 border border-border/20">
                      <HeadphonesIcon className="w-5 h-5 text-primary mt-0.5" />
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

          {/* Compact Header */}
          <JobsCompactHeader
            isAdmin={isAdmin}
            searchQuery={filters.search}
            onSearchChange={(query) => updateFilters({ search: query })}
            onCreateJob={() => setCreateDialogOpen(true)}
            onNavigate={navigate}
            onRefresh={fetchJobsWithMetrics}
            searchInputRef={searchInputRef}
          />

          {/* Inline Stats Bar */}
          <JobsInlineStats
            activeJobs={companyMetrics.activeSearches}
            totalCandidates={companyMetrics.totalCandidates}
            avgDaysOpen={companyMetrics.avgTimeToHire}
            conversionRate={companyMetrics.conversionRate}
            clubSyncActive={companyMetrics.clubSyncActive}
            totalJobs={jobs.length}
          />

          {/* AI Banner (dismissible) */}
          {isAdmin && (
            <JobsAIBanner companyId={companyId || undefined} />
          )}

          {/* Unified Filter Bar */}
          <JobsUnifiedFilterBar
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            statusCounts={statusCounts}
            quickFilter={filters.quickFilter as QuickFilterType}
            onQuickFilterChange={handleQuickFilterChange}
            quickFilterCounts={{
              expiringSoon: jobCounts.expiringSoon,
              recentActivity: jobCounts.recentActivity,
              highEngagement: jobCounts.highEngagement,
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filters={filters}
            onFilterChange={updateFilters}
            onResetFilters={resetFilters}
            hasActiveFilters={hasActiveFilters}
            availableCompanies={availableCompanies}
            savedPresets={presets}
            onApplyPreset={(presetFilters) => updateFilters(presetFilters)}
            onSavePreset={(name) => addPreset(name, filters)}
            onDeletePreset={deletePreset}
            onShowKeyboardShortcuts={() => setShortcutsDialogOpen(true)}
          />

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio className="w-3 h-3 text-success animate-pulse" />
            <span>Live updates enabled</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{statusFilteredJobs.length} jobs</span>
          </div>

          {/* Job Views */}
          {statusFilteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-card/30 mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? "Try adjusting your filters to see more results"
                  : "Create your first job to get started"}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Job
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Grid View - Compact Cards */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {statusFilteredJobs.map((job, index) => (
                    <CompactJobCard
                      key={job.id}
                      job={job}
                      isSelected={isSelected(job.id)}
                      isFocused={focusedIndex === index}
                      onToggleSelect={() => toggleJob(job.id)}
                      onNavigate={() => navigate(`/jobs/${job.id}/dashboard`)}
                      onPublish={() => handlePublishJob(job.id, job.title)}
                      onUnpublish={() => handleUnpublishJob(job.id, job.title)}
                      onClose={() => handleCloseJob(job.id, job.title)}
                      onReopen={() => handleReopenJob(job.id, job.title)}
                      onArchive={() => handleArchiveJob(job.id, job.title)}
                      onRestore={() => handleRestoreJob(job.id, job.title)}
                    />
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <JobListView
                  jobs={statusFilteredJobs}
                  selectedIds={selectedIds}
                  focusedIndex={focusedIndex}
                  onToggleSelect={toggleJob}
                  onNavigate={(id) => navigate(`/jobs/${id}/dashboard`)}
                  onPublish={handlePublishJob}
                  onUnpublish={handleUnpublishJob}
                  onClose={handleCloseJob}
                  onReopen={handleReopenJob}
                  onArchive={handleArchiveJob}
                  onRestore={handleRestoreJob}
                  isSelected={isSelected}
                />
              )}

              {/* Kanban View */}
              {viewMode === 'kanban' && (
                <JobKanbanView
                  jobs={statusFilteredJobs}
                  selectedIds={selectedIds}
                  focusedIndex={focusedIndex}
                  onToggleSelect={toggleJob}
                  onNavigate={(id) => navigate(`/jobs/${id}/dashboard`)}
                  onStatusChange={async (jobId, newStatus) => {
                    const job = statusFilteredJobs.find(j => j.id === jobId);
                    if (!job) return;
                    
                    switch (newStatus) {
                      case 'published':
                        await handlePublishJob(jobId, job.title);
                        break;
                      case 'draft':
                        await handleUnpublishJob(jobId, job.title);
                        break;
                      case 'closed':
                        await handleCloseJob(jobId, job.title);
                        break;
                      case 'archived':
                        await handleArchiveJob(jobId, job.title);
                        break;
                    }
                  }}
                  isSelected={isSelected}
                />
              )}

              {/* Table View */}
              {viewMode === 'table' && (
                <JobTableView
                  jobs={statusFilteredJobs}
                  selectedIds={selectedIds}
                  focusedIndex={focusedIndex}
                  onToggleSelect={toggleJob}
                  onToggleAll={toggleAll}
                  isAllSelected={isAllSelected}
                  onNavigate={(id) => navigate(`/jobs/${id}/dashboard`)}
                  onPublish={handlePublishJob}
                  onUnpublish={handleUnpublishJob}
                  onClose={handleCloseJob}
                  onReopen={handleReopenJob}
                  onArchive={handleArchiveJob}
                  onRestore={handleRestoreJob}
                  isSelected={isSelected}
                />
              )}
            </>
          )}

          {/* Bulk Action Bar */}
          <JobBulkActionBar
            selectedCount={selectedCount}
            onClearSelection={clearSelection}
            onPublishAll={handleBulkPublish}
            onCloseAll={handleBulkClose}
            onArchiveAll={handleBulkArchive}
            onExportSelected={handleBulkExport}
            isProcessing={isBulkProcessing}
          />

          {/* Keyboard Shortcuts Dialog */}
          <KeyboardShortcutsDialog
            open={shortcutsDialogOpen}
            onOpenChange={setShortcutsDialogOpen}
          />

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
