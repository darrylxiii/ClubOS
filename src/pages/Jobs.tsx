import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { JobCard } from "@/components/JobCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Search, SlidersHorizontal, Check, Zap } from "lucide-react";
import { toast } from "sonner";
import { ReferralDialog } from "@/components/ReferralDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { convertCurrency, formatCurrency, type Currency } from "@/lib/currencyConversion";
import { PartnerJobsHome } from "@/components/partner/PartnerJobsHome";
import { useUserRole } from "@/hooks/useUserRole";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";
import { AIPageCopilot } from "@/components/ai/AIPageCopilot";
import { logger } from "@/lib/logger";
import { useNavigate } from "react-router-dom";

type SortOption = "match" | "newest" | "salary";
const Jobs = () => {
  const {
    user
  } = useAuth();
  const {
    role,
    companyId: userCompanyId
  } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [clubSyncEnabled, setClubSyncEnabled] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{
    id: string;
    title: string;
    company: string;
  } | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCurrency, setUserCurrency] = useState<Currency>('EUR');

  // Fetch user's preferred currency
  useEffect(() => {
    const fetchUserCurrency = async () => {
      if (!user) return;
      const {
        data
      } = await supabase.from('profiles').select('preferred_currency').eq('id', user.id).single();
      if (data?.preferred_currency) {
        setUserCurrency(data.preferred_currency as Currency);
      }
    };
    fetchUserCurrency();
  }, [user]);

  // Fetch jobs from database with match scores
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        // Fetch jobs with match scores if user is logged in
        const jobsQuery = supabase.from('jobs').select(`
          id,
          title,
          location,
          employment_type,
          salary_min,
          salary_max,
          currency,
          created_at,
          company_id,
          tags,
          companies (
            name,
            slug,
            logo_url
          )
        `).order('created_at', { ascending: false });

        const { data: jobsData, error } = await jobsQuery;
        if (error) throw error;

        // Fetch match scores if user exists
        let matchScoresMap: Record<string, number> = {};
        if (user?.id) {
          const { data: matchScores } = await supabase
            .from('match_scores')
            .select('job_id, overall_score')
            .eq('user_id', user.id);
          
          if (matchScores) {
            matchScoresMap = matchScores.reduce((acc, ms) => {
              acc[ms.job_id] = ms.overall_score;
              return acc;
            }, {} as Record<string, number>);
          }
        }

        // Transform data for display
        const transformedJobs = jobsData?.map((job: any) => ({
          id: job.id,
          title: job.title,
          company: job.companies?.name || 'Unknown Company',
          companySlug: job.companies?.slug,
          companyLogo: job.companies?.logo_url,
          location: job.location || 'Remote',
          type: job.employment_type || 'fulltime',
          postedDate: new Date(job.created_at).toLocaleDateString(),
          postedDaysAgo: Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          tags: Array.isArray(job.tags) ? job.tags : [],
          matchScore: matchScoresMap[job.id] || null,
          salary: job.salary_max || 0,
          salaryMin: job.salary_min || 0,
          salaryMax: job.salary_max || 0,
          currency: job.currency as Currency
        })) || [];
        setJobs(transformedJobs);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [user]);

  // Trigger match calculation for jobs without scores
  useEffect(() => {
    const calculateMissingMatchScores = async () => {
      if (!user?.id || jobs.length === 0) return;

      const jobsNeedingScores = jobs.filter(job => job.matchScore === null);
      if (jobsNeedingScores.length === 0) return;

      console.log(`Calculating match scores for ${jobsNeedingScores.length} jobs...`);

      // Calculate scores in batches to avoid overwhelming the server
      for (const job of jobsNeedingScores.slice(0, 5)) {
        try {
          const { data, error } = await supabase.functions.invoke('calculate-enhanced-match', {
            body: {
              jobId: job.id
            }
          });

          if (error) {
            console.error('Error calculating match score for job:', job.id, error);
            continue;
          }

          // Update local state with new score
          if (data?.score) {
            setJobs(prevJobs =>
              prevJobs.map(j =>
                j.id === job.id ? { ...j, matchScore: data.score } : j
              )
            );
          }
        } catch (error) {
          console.error('Error calculating match score:', error);
        }
      }
    };

    // Delay calculation slightly to avoid blocking initial render
    const timer = setTimeout(calculateMissingMatchScores, 1000);
    return () => clearTimeout(timer);
  }, [jobs, user]);
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      switch (sortBy) {
        case "match":
          return (b.matchScore ?? 0) - (a.matchScore ?? 0);
        case "newest":
          return a.postedDaysAgo - b.postedDaysAgo;
        case "salary":
          return b.salary - a.salary;
        default:
          return 0;
      }
    });
  }, [jobs, sortBy]);

  // Memoize currency conversions to prevent recalculation on every render
  const jobsWithConvertedSalary = useMemo(() => {
    return sortedJobs.map(job => {
      if (!job.salaryMax) {
        return { ...job, convertedSalary: null };
      }
      
      const convertedMin = convertCurrency(job.salaryMin || 0, job.currency, userCurrency);
      const convertedMax = convertCurrency(job.salaryMax, job.currency, userCurrency);
      
      return {
        ...job,
        convertedSalary: `${formatCurrency(convertedMin, userCurrency, { compact: true })} - ${formatCurrency(convertedMax, userCurrency, { compact: true })}`
      };
    });
  }, [sortedJobs, userCurrency]);
  const handleApply = (jobTitle: string) => {
    toast.success(`Applied to ${jobTitle}!`, {
      description: "Your application has been submitted successfully."
    });
  };
  const handleRefer = (jobId: string, jobTitle: string, company: string) => {
    setSelectedJob({
      id: jobId,
      title: jobTitle,
      company
    });
    setReferralDialogOpen(true);
  };
  const handleClubSync = (jobTitle: string) => {
    toast.success(`Club Sync activated for ${jobTitle}!`, {
      description: "Elite auto-apply initiated. You'll be notified of next steps."
    });
  };
  const toggleSaveJob = (jobId: string, jobTitle: string) => {
    setSavedJobIds(prev => {
      const isSaved = prev.includes(jobId);
      if (isSaved) {
        toast.info(`Removed ${jobTitle} from saved jobs`);
        return prev.filter(id => id !== jobId);
      } else {
        toast.success(`Saved ${jobTitle}!`, {
          description: "You can view all saved jobs in the Saved tab."
        });
        return [...prev, jobId];
      }
    });
  };

  // Saved jobs with currency conversion
  const savedJobs = useMemo(() => {
    return jobsWithConvertedSalary.filter(job => savedJobIds.includes(job.id));
  }, [jobsWithConvertedSalary, savedJobIds]);
  const navigate = useNavigate();

  // If user is Partner or Admin, show Partner-specific view
  if ((role === 'partner' || role === 'admin') && (userCompanyId || role === 'admin')) {
    return <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <PartnerJobsHome companyId={userCompanyId || null} />
        </div>
      </AppLayout>;
  }

  // Candidate view (default)
  return <AppLayout>
      <OceanBackgroundVideo />
      
      <div className="relative z-10 container mx-auto px-4 py-8 pb-safe space-y-6">
        {/* Header */}
        <div className="space-y-4 border-b-2 border-foreground pb-8">
          <p className="text-caps text-muted-foreground">Curated Roles</p>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
            Elite Opportunities
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">Connecting only the 0.1% with each other</p>
        </div>

        {/* Search and Filters */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="all">
              All Jobs ({sortedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="saved">
              Saved Jobs ({savedJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="text" placeholder="Search jobs by title, company, or skills..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="shrink-0">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Sort by: {sortBy === "match" ? "Match %" : sortBy === "newest" ? "Newest" : "Salary"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-background border-border z-50" align="end">
                    <DropdownMenuItem onClick={() => setSortBy("match")} className="cursor-pointer">
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "match" ? "opacity-100" : "opacity-0"}`} />
                      Match %
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("newest")} className="cursor-pointer">
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "newest" ? "opacity-100" : "opacity-0"}`} />
                      Newest
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("salary")} className="cursor-pointer">
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "salary" ? "opacity-100" : "opacity-0"}`} />
                      Salary (High to Low)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Club Sync Toggle */}
              <div className="flex items-center gap-4 p-5 rounded-xl border-0 bg-card/20 backdrop-blur-xl hover:bg-card/25 transition-all duration-300">
                <div className="p-3 rounded-xl bg-background/30 border border-border/10">
                  <Zap className={`w-5 h-5 ${clubSyncEnabled ? "text-foreground" : "text-muted-foreground/60"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold tracking-tight">Club Sync</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 bg-background/30 px-2 py-0.5 rounded">
                      AUTO-APPLY
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground/70">
                    Automatically apply to all matches above 90%
                  </p>
                </div>
                <Switch 
                  checked={clubSyncEnabled} 
                  onCheckedChange={checked => {
                    setClubSyncEnabled(checked);
                    toast.success(checked ? "Club Sync enabled" : "Club Sync disabled", {
                      description: checked ? "You'll automatically apply to roles with 90%+ match" : "Auto-apply has been turned off"
                    });
                  }} 
                />
              </div>
            </div>

            {/* Job Listings */}
            {loading ? <div className="text-center py-12">
                <p className="text-muted-foreground">Loading jobs...</p>
              </div> : sortedJobs.length === 0 ? <div className="text-center py-12">
                <p className="text-muted-foreground">No jobs available</p>
              </div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {jobsWithConvertedSalary.map(job => {
              return <JobCard 
                key={job.id} 
                id={job.id}
                title={job.title} 
                company={job.company} 
                companyLogo={job.companyLogo}
                companySlug={job.companySlug}
                location={job.location} 
                type={job.type} 
                postedDate={job.postedDate} 
                tags={job.tags} 
                salary={job.convertedSalary} 
                matchScore={job.matchScore} 
                isSaved={savedJobIds.includes(job.id)} 
                onApply={() => handleApply(job.title)} 
                onRefer={() => handleRefer(job.id, job.title, job.company)} 
                onClubSync={() => handleClubSync(job.title)} 
                onToggleSave={() => toggleSaveJob(job.id, job.title)} 
              />;
            })}
              </div>}
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="text" placeholder="Search saved jobs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="shrink-0">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Sort by: {sortBy === "match" ? "Match %" : sortBy === "newest" ? "Newest" : "Salary"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-background border-border z-50" align="end">
                    <DropdownMenuItem onClick={() => setSortBy("match")} className="cursor-pointer">
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "match" ? "opacity-100" : "opacity-0"}`} />
                      Match %
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("newest")} className="cursor-pointer">
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "newest" ? "opacity-100" : "opacity-0"}`} />
                      Newest
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("salary")} className="cursor-pointer">
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "salary" ? "opacity-100" : "opacity-0"}`} />
                      Salary (High to Low)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Club Sync Toggle */}
              <div className="flex items-center gap-4 p-5 rounded-xl border-0 bg-card/20 backdrop-blur-xl hover:bg-card/25 transition-all duration-300">
                <div className="p-3 rounded-xl bg-background/30 border border-border/10">
                  <Zap className={`w-5 h-5 ${clubSyncEnabled ? "text-foreground" : "text-muted-foreground/60"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold tracking-tight">Club Sync</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 bg-background/30 px-2 py-0.5 rounded">
                      AUTO-APPLY
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground/70">
                    Automatically apply to all matches above 90%
                  </p>
                </div>
                <Switch 
                  checked={clubSyncEnabled} 
                  onCheckedChange={checked => {
                    setClubSyncEnabled(checked);
                    toast.success(checked ? "Club Sync enabled" : "Club Sync disabled", {
                      description: checked ? "You'll automatically apply to roles with 90%+ match" : "Auto-apply has been turned off"
                    });
                  }} 
                />
              </div>
            </div>

            {/* Saved Job Listings */}
            {savedJobs.length === 0 ? <div className="text-center py-12">
                <p className="text-muted-foreground">No saved jobs yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click the bookmark icon on any job to save it here
                </p>
              </div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {savedJobs.map(job => {
              return <JobCard 
                key={job.id} 
                id={job.id}
                title={job.title} 
                company={job.company} 
                companyLogo={job.companyLogo}
                companySlug={job.companySlug}
                location={job.location} 
                type={job.type} 
                postedDate={job.postedDate} 
                tags={job.tags} 
                salary={job.convertedSalary} 
                matchScore={job.matchScore} 
                isSaved={true} 
                onApply={() => handleApply(job.title)} 
                onRefer={() => handleRefer(job.id, job.title, job.company)} 
                onClubSync={() => handleClubSync(job.title)} 
                onToggleSave={() => toggleSaveJob(job.id, job.title)} 
              />;
            })}
              </div>}
          </TabsContent>
        </Tabs>

        {selectedJob && <ReferralDialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen} jobId={selectedJob.id} jobTitle={selectedJob.title} companyName={selectedJob.company} />}
        <AIPageCopilot 
          currentPage="/jobs" 
          contextData={{ jobsCount: sortedJobs.length }}
          onAction={(action) => {
            if (action === 'search_jobs') navigate('/club-ai');
          }}
        />
      </div>
    </AppLayout>;
};
export default Jobs;