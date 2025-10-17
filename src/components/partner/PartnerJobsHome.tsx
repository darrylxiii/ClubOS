import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
} from "lucide-react";
import { CreateJobDialog } from "./CreateJobDialog";
import { AdminBoardTools } from "./AdminBoardTools";
import { useUserRole } from "@/hooks/useUserRole";
import confetti from "canvas-confetti";

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
  avg_time_to_hire_days: number | null;
  conversion_rate: number | null;
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
  const isAdmin = role === 'admin';

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
  }, [companyId]);

  const fetchJobsWithMetrics = async () => {
    try {
      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, status, location, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Fetch all applications for these jobs
      const jobIds = (jobsData || []).map(j => j.id.toString());
      const { data: applicationsData } = await supabase
        .from('applications')
        .select('id, job_id, current_stage_index, stages, updated_at')
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

        // Get most recent activity
        const lastActivity = applications.length > 0
          ? applications.reduce((latest: string | null, app: any) => {
              const appDate = app.updated_at;
              return !latest || appDate > latest ? appDate : latest;
            }, null)
          : null;

        // Calculate average time to hire (simplified - in days since creation)
        const hiredApps = applications.filter((app: any) => {
          const stages = app.stages || [];
          return stages.some((s: any) => s.status?.toLowerCase() === 'hired');
        });
        const avgTimeToHire = hiredApps.length > 0
          ? Math.round(
              hiredApps.reduce((sum: number, app: any) => {
                const daysSinceCreated = Math.floor(
                  (new Date(app.updated_at).getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );
                return sum + daysSinceCreated;
              }, 0) / hiredApps.length
            )
          : null;

        // Calculate conversion rate (hired / total applied)
        const conversionRate = candidateCount > 0
          ? Math.round((hiredApps.length / candidateCount) * 100)
          : null;

        return {
          id: job.id,
          title: job.title,
          status: job.status,
          location: job.location || 'Remote',
          created_at: job.created_at,
          club_sync_status: Math.random() > 0.5 ? 'accepted' : Math.random() > 0.5 ? 'pending' : 'not_offered', // TODO: Add real Club Sync table
          candidate_count: candidateCount,
          active_stage_count: activeStageCount,
          last_activity: lastActivity,
          avg_time_to_hire_days: avgTimeToHire,
          conversion_rate: conversionRate,
        };
      });

      setJobs(jobsWithMetrics);

      // Calculate company-wide metrics
      const activeJobs = jobsWithMetrics.filter(j => j.status === 'published').length;
      const totalCandidates = jobsWithMetrics.reduce((sum, j) => sum + j.candidate_count, 0);
      const clubSyncCount = jobsWithMetrics.filter(j => j.club_sync_status === 'accepted').length;
      
      const allTimeToHire = jobsWithMetrics
        .map(j => j.avg_time_to_hire_days)
        .filter(t => t !== null) as number[];
      const avgCompanyTimeToHire = allTimeToHire.length > 0
        ? Math.round(allTimeToHire.reduce((sum, t) => sum + t, 0) / allTimeToHire.length)
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

  const handleClubSyncAction = async (jobId: string, action: 'accept' | 'decline') => {
    // TODO: Implement Club Sync API call
    toast.success(`Club Sync ${action === 'accept' ? 'accepted' : 'declined'} for this role`, {
      description: action === 'accept' 
        ? "The Quantum Club will now source and vet candidates for you"
        : "Club Sync has been declined for this role"
    });
    fetchJobsWithMetrics();
  };

  const handleQuickAction = (action: string, jobId: string, jobTitle: string) => {
    switch (action) {
      case 'invite':
        toast.info(`Opening invite flow for ${jobTitle}`);
        // TODO: Open invite dialog
        break;
      case 'export':
        toast.info(`Exporting pipeline for ${jobTitle}`);
        // TODO: Implement export
        break;
      case 'support':
        toast.info(`Requesting Club support for ${jobTitle}`);
        // TODO: Open support request
        break;
      case 'analytics':
        navigate(`/jobs/${jobId}/dashboard`);
        break;
    }
  };

  const getClubSyncBadge = (status: string | null) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-accent/20 text-accent border-accent"><CheckCircle className="w-3 h-3 mr-1" />Club Sync Active</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-primary text-primary"><AlertCircle className="w-3 h-3 mr-1" />Pending Approval</Badge>;
      case 'not_offered':
        return <Badge variant="outline" className="border-muted-foreground/50"><XCircle className="w-3 h-3 mr-1" />Not Active</Badge>;
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
    <TooltipProvider>
      {/* Welcome Modal */}
      <Dialog open={welcomeModalOpen} onOpenChange={setWelcomeModalOpen}>
        <DialogContent className="sm:max-w-lg glass-card">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-gradient-accent">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <DialogTitle className="text-2xl">Welcome to Your Hiring HQ</DialogTitle>
            </div>
            <DialogDescription className="text-base space-y-4 pt-4">
              <p>Your exclusive command center for world-class hiring. Here's what you can do:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span><strong>Track live metrics</strong> across all your searches</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span><strong>Activate Club Sync</strong> for vetted, premium candidates 3x faster</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span><strong>Manage your pipeline</strong> with advanced analytics and insights</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
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
              <div className="p-3 rounded-full bg-accent/20">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <DialogTitle className="text-xl">What's Club Sync?</DialogTitle>
            </div>
            <DialogDescription className="text-base space-y-4 pt-4">
              <p className="font-semibold text-foreground">Your premium hiring accelerator.</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <TrendingUp className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">3x Faster Hiring</p>
                    <p className="text-sm text-muted-foreground">Get vetted candidates in days, not weeks</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <Award className="w-5 h-5 text-accent mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Pre-Vetted Talent</p>
                    <p className="text-sm text-muted-foreground">Every candidate is Club-verified for quality</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <HeadphonesIcon className="w-5 h-5 text-accent mt-0.5" />
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

      {/* Admin Board Tools - Only for Admins */}
      {isAdmin && (
        <AdminBoardTools 
          companyId={companyId} 
          onRefresh={fetchJobsWithMetrics}
        />
      )}

      {/* Header */}
      <div className="space-y-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2"
              onClick={() => navigate('/company-applications')}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Applications Hub</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2"
              onClick={() => navigate('/company-jobs')}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Company Settings</span>
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">{isAdmin ? "Manage Companies" : "Invite Team"}</span>
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              New Job
            </Button>
          </div>
        </div>

        {/* Bento KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Active Searches - Larger emphasis */}
          <Card className="border-2 border-foreground/10 bg-gradient-to-br from-accent/10 via-background to-background hover:shadow-xl transition-all sm:col-span-2 lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-gradient-accent">
                  <Briefcase className="w-6 h-6 text-primary-foreground" />
                </div>
                <Badge className="text-xs bg-success text-success-foreground">Live</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black">{companyMetrics.activeSearches}</p>
                <p className="text-sm font-medium text-muted-foreground">Active Searches</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Candidates */}
          <Card className="border-2 border-foreground/10 bg-gradient-to-br from-accent/5 via-background to-background hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <Badge variant="outline" className="text-xs">Pipeline</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black">{companyMetrics.totalCandidates}</p>
                <p className="text-sm text-muted-foreground">Candidates in Pipeline</p>
              </div>
            </CardContent>
          </Card>

          {/* Avg Time to Hire */}
          <Card className="border-2 border-foreground/10 bg-gradient-to-br from-background via-background to-primary/5 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">Speed</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black">
                  {companyMetrics.avgTimeToHire !== null ? `${companyMetrics.avgTimeToHire}d` : '—'}
                </p>
                <p className="text-sm text-muted-foreground">Avg. Time-to-Hire</p>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card className="border-2 border-foreground/10 bg-gradient-to-br from-accent/5 via-background to-background hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <Badge variant="outline" className="text-xs">Success</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black">
                  {companyMetrics.conversionRate !== null ? `${companyMetrics.conversionRate}%` : '—'}
                </p>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
              </div>
            </CardContent>
          </Card>

          {/* Club Sync Status - Larger emphasis */}
          <Card className="border-2 border-accent/30 bg-gradient-to-br from-accent/10 via-background to-background hover:shadow-xl transition-all sm:col-span-2 lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-3 rounded-xl bg-accent/20">
                    <Zap className="w-6 h-6 text-accent" />
                  </div>
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
                <Badge className="text-xs bg-accent text-primary-foreground">Premium</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black text-accent">{companyMetrics.clubSyncActive}</p>
                <p className="text-sm font-medium text-muted-foreground">Club Sync Active</p>
              </div>
              {companyMetrics.clubSyncActive < companyMetrics.activeSearches && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-3 text-xs gap-2 hover:bg-accent/10 hover:border-accent"
                  onClick={() => toast.info("Contact your Quantum Club rep to activate Club Sync")}
                >
                  <Sparkles className="w-3 h-3" />
                  Enable {companyMetrics.activeSearches - companyMetrics.clubSyncActive} More
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <Card className="border-2 border-foreground/10 bg-gradient-to-br from-primary/5 via-background to-background hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">Action</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black">{companyMetrics.pendingActions}</p>
                <p className="text-sm text-muted-foreground">Pending Actions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Bar with Notifications */}
        <Card className="border-2 border-foreground/10 bg-gradient-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-accent" />
                <span className="font-semibold">Quick Actions</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-2 sm:pb-0">
                <Button variant="outline" size="sm" className="gap-2 relative">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Interviews</span>
                  {companyMetrics.pendingActions > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
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
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-accent text-accent-foreground text-xs">
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

        <p className="text-muted-foreground">
          Manage your hiring pipeline, track candidate progress, and leverage Club Sync for premium vetting
        </p>
      </div>

      {/* Jobs Grid */}
      {jobs.length === 0 ? (
        <Card className="border-2 border-dashed border-border bg-gradient-card hover:border-accent/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="p-4 rounded-full bg-accent/10 mb-4">
              <Briefcase className="w-12 h-12 text-accent" />
            </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="border-2 border-foreground/10 bg-gradient-to-br from-background via-background to-primary/5 hover:shadow-2xl hover:border-primary/30 transition-all duration-300 backdrop-blur-sm"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <CardTitle className="text-xl font-black uppercase mb-2">
                      {job.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={job.status === 'published' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                      {getClubSyncBadge(job.club_sync_status)}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {job.status === 'draft' && (
                        <DropdownMenuItem onClick={() => handlePublishJob(job.id, job.title)} className="text-accent">
                          <Flag className="w-4 h-4 mr-2" />
                          Publish Job
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleQuickAction('invite', job.id, job.title)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Candidate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleQuickAction('export', job.id, job.title)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Pipeline
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleQuickAction('support', job.id, job.title)}>
                        <HeadphonesIcon className="w-4 h-4 mr-2" />
                        Request Club Support
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleQuickAction('analytics', job.id, job.title)}>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Pipeline Health Check
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Club Sync Action */}
                {job.club_sync_status === 'pending' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30 animate-fade-in">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium flex-1">Club Sync Invitation</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClubSyncAction(job.id, 'decline')}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        className="bg-accent hover:bg-accent/90"
                        onClick={() => handleClubSyncAction(job.id, 'accept')}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>
                )}

                {job.club_sync_status === 'not_offered' && (
                  <div className="p-3 rounded-lg bg-gradient-card border border-border/50">
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-accent mt-0.5" />
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
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-gradient-card border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Candidates</span>
                    </div>
                    <p className="text-2xl font-bold">{job.candidate_count}</p>
                    <p className="text-xs text-muted-foreground">{job.active_stage_count} active</p>
                  </div>

                  <div className="p-3 rounded-lg bg-gradient-card border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-accent" />
                      <span className="text-xs text-muted-foreground">Avg. Time</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {job.avg_time_to_hire_days !== null ? `${job.avg_time_to_hire_days}d` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">to hire</p>
                  </div>

                  <div className="p-3 rounded-lg bg-gradient-card border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <span className="text-xs text-muted-foreground">Conversion</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {job.conversion_rate !== null ? `${job.conversion_rate}%` : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">hired rate</p>
                  </div>

                  <div className="p-3 rounded-lg bg-gradient-card border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Last Activity</span>
                    </div>
                    <p className="text-sm font-bold">{formatLastActivity(job.last_activity)}</p>
                  </div>
                </div>

                {/* Primary CTA */}
                <Button
                  className="w-full bg-primary hover:bg-primary/90 font-semibold"
                  onClick={() => navigate(`/jobs/${job.id}/dashboard`)}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Open Job Dashboard
                </Button>
              </CardContent>
            </Card>
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
  );
};
