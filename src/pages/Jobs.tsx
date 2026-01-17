import { useState, useEffect, useMemo, useRef } from "react";
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
import { useRole } from "@/contexts/RoleContext";
import { OceanBackgroundVideo } from "@/components/OceanBackgroundVideo";
import { AIPageCopilot } from "@/components/ai/AIPageCopilot";
import { useNavigate } from "react-router-dom";
import { HorizontalFilters } from "@/components/jobs/HorizontalFilters";
import type { JobFilters } from "@/components/jobs/JobFilterSidebar";
import { cn } from "@/lib/utils";
import { JobsForYouSection } from "@/components/jobs/JobsForYouSection";
import { ClubSyncConfirmationDialog } from "@/components/clubsync";

type SortOption = "match" | "newest" | "salary";

const Jobs = () => {
  const { user } = useAuth();
  const { currentRole: role, companyId: userCompanyId } = useRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [clubSyncEnabled, setClubSyncEnabled] = useState(false);
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(true);
  const [filters, setFilters] = useState<JobFilters>({
    locations: [],
    salaryMin: 0,
    salaryMax: 500000,
    employmentTypes: [],
    remoteOnly: false,
    hybridIncluded: false,
    experienceYears: [0, 20],
    companies: [],
    departments: [],
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{
    id: string;
    title: string;
    company: string;
  } | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCurrency, setUserCurrency] = useState<Currency>('EUR');
  const [clubSyncDialogOpen, setClubSyncDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [matchFilterActive, setMatchFilterActive] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Fetch user's preferred currency and settings
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('preferred_currency, club_sync_enabled')
        .eq('id', user.id)
        .single();
      
      if (data?.preferred_currency) {
        setUserCurrency(data.preferred_currency as Currency);
      }
      if (data?.club_sync_enabled !== undefined) {
        setClubSyncEnabled(data.club_sync_enabled ?? false);
      }
    };
    fetchUserSettings();
  }, [user]);

  // Fetch saved jobs from database
  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!user) {
        setLoadingSavedJobs(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('saved_jobs')
          .select('job_id')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        setSavedJobIds(data?.map(sj => sj.job_id) || []);
      } catch (error) {
        console.error('Error fetching saved jobs:', error);
      } finally {
        setLoadingSavedJobs(false);
      }
    };
    
    fetchSavedJobs();
  }, [user]);

  // Fetch jobs from database with match scores
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
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
          is_continuous,
          hired_count,
          target_hire_count,
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
          currency: job.currency as Currency,
          isContinuous: job.is_continuous || false,
          hiredCount: job.hired_count || 0,
          targetHireCount: job.target_hire_count,
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

      for (const job of jobsNeedingScores.slice(0, 5)) {
        try {
          const { data, error } = await supabase.functions.invoke('calculate-enhanced-match', {
            body: { jobId: job.id }
          });

          if (error) {
            console.error('Error calculating match score for job:', job.id, error);
            continue;
          }

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

  // Memoize currency conversions
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
    setSelectedJob({ id: jobId, title: jobTitle, company });
    setReferralDialogOpen(true);
  };

  const handleClubSync = (jobTitle: string) => {
    toast.success(`Club Sync activated for ${jobTitle}!`, {
      description: "Elite auto-apply initiated. You'll be notified of next steps."
    });
  };

  const handleClubSyncToggle = async (enabled: boolean, preferences?: any) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          club_sync_enabled: enabled,
          ...(preferences && { club_sync_preferences: preferences })
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setClubSyncEnabled(enabled);
      toast.success(enabled ? "Club Sync enabled" : "Club Sync disabled", {
        description: enabled ? "You'll automatically apply to roles with 90%+ match" : "Auto-apply has been turned off"
      });
    } catch (error) {
      console.error('Error updating Club Sync:', error);
      toast.error('Failed to update Club Sync setting');
    }
  };

  const handleViewAllTopMatches = () => {
    setMatchFilterActive(true);
    setActiveTab("all");
    // Scroll to tabs section
    tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get eligible jobs for ClubSync preview
  const eligibleJobsForClubSync = useMemo(() => {
    return jobs
      .filter(job => job.matchScore && job.matchScore >= 85)
      .map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        matchScore: job.matchScore,
        location: job.location,
      }));
  }, [jobs]);

  const toggleSaveJob = async (jobId: string, jobTitle: string) => {
    if (!user) {
      toast.error('Please sign in to save jobs');
      return;
    }

    const isSaved = savedJobIds.includes(jobId);
    
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', jobId);
        
        if (error) throw error;
        
        setSavedJobIds(prev => prev.filter(id => id !== jobId));
        toast.info(`Removed ${jobTitle} from saved jobs`);
      } else {
        const { error } = await supabase
          .from('saved_jobs')
          .insert({ user_id: user.id, job_id: jobId });
        
        if (error) throw error;
        
        setSavedJobIds(prev => [...prev, jobId]);
        toast.success(`Saved ${jobTitle}!`, {
          description: "You can view all saved jobs in the Saved tab."
        });
      }
    } catch (error) {
      console.error('Error toggling saved job:', error);
      toast.error('Failed to save job. Please try again.');
    }
  };

  // Extract unique companies and departments
  const availableCompanies = useMemo(() => {
    const companies = new Set(jobs.map(job => job.company).filter(Boolean));
    return Array.from(companies).sort();
  }, [jobs]);

  const availableDepartments = useMemo(() => {
    const departments = new Set(
      jobs.flatMap(job => job.tags || []).filter(Boolean)
    );
    return Array.from(departments).sort();
  }, [jobs]);

  // Apply filters to jobs
  const filteredJobs = useMemo(() => {
    return jobsWithConvertedSalary.filter(job => {
      if (filters.locations.length > 0) {
        const matchesLocation = filters.locations.some(loc => 
          job.location.toLowerCase().includes(loc.toLowerCase())
        );
        if (!matchesLocation) return false;
      }

      if (job.salaryMax && (job.salaryMax < filters.salaryMin || job.salaryMin > filters.salaryMax)) {
        return false;
      }

      if (filters.employmentTypes.length > 0 && !filters.employmentTypes.includes(job.type)) {
        return false;
      }

      if (filters.remoteOnly && !job.location.toLowerCase().includes('remote')) {
        return false;
      }

      if (filters.companies.length > 0 && !filters.companies.includes(job.company)) {
        return false;
      }

      if (filters.departments.length > 0) {
        const jobDepartments = job.tags || [];
        const matchesDepartment = filters.departments.some(dept => 
          jobDepartments.includes(dept)
        );
        if (!matchesDepartment) return false;
      }

      return true;
    });
  }, [jobsWithConvertedSalary, filters]);

  // Saved jobs with currency conversion
  const savedJobs = useMemo(() => {
    return filteredJobs.filter(job => savedJobIds.includes(job.id));
  }, [filteredJobs, savedJobIds]);

  const navigate = useNavigate();

  // If user is Partner or Admin, show Partner-specific view
  if ((role === 'partner' || role === 'admin') && (userCompanyId || role === 'admin')) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <PartnerJobsHome companyId={userCompanyId || null} />
        </div>
      </AppLayout>
    );
  }

  // Candidate view (default) - NEW ELITE ARCHITECTURE
  return (
    <AppLayout>
      <OceanBackgroundVideo />
      
      <div className="relative z-10 container mx-auto px-4 py-8 pb-safe">
        <div className="space-y-6">
          {/* Search Bar - Full Width */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search elite opportunities by title, company, or skills..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-12 h-14 text-base bg-card/30 backdrop-blur-xl border-border/40"
            />
          </div>

          {/* Elite Opportunities Header */}
          <div className="text-center space-y-3 py-8 border-b-2 border-border/40">
            <p className="text-caps text-muted-foreground tracking-widest">
              CURATED ROLES
            </p>
            <h1 className="text-5xl font-black uppercase tracking-tight">
              Elite Opportunities
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connecting only the 0.1% with each other
            </p>
          </div>

          {/* Club Sync - Compact Inline */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-card/20 backdrop-blur-xl border border-border/30 hover:bg-card/25 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-background/30 border border-border/10">
                <Zap className={`w-5 h-5 ${clubSyncEnabled ? "text-foreground" : "text-muted-foreground/60"}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">Club Sync</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 bg-background/30 px-2 py-0.5 rounded">
                    AUTO-APPLY
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Auto-apply to 90%+ matches
                </span>
              </div>
            </div>
            <Switch 
              checked={clubSyncEnabled} 
              onCheckedChange={(checked) => {
                if (!user) {
                  toast.error('Please sign in to use Club Sync');
                  return;
                }
                
                if (checked) {
                  // Open confirmation dialog when enabling
                  setClubSyncDialogOpen(true);
                } else {
                  // Disable directly
                  handleClubSyncToggle(false);
                }
              }} 
            />
          </div>

          {/* Horizontal Filters Bar */}
          <HorizontalFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={() => setFilters({
              locations: [],
              salaryMin: 0,
              salaryMax: 500000,
              employmentTypes: [],
              remoteOnly: false,
              hybridIncluded: false,
              experienceYears: [0, 20],
              companies: [],
              departments: [],
            })}
            totalJobs={jobs.length}
            filteredJobsCount={filteredJobs.length}
            availableCompanies={availableCompanies}
            availableDepartments={availableDepartments}
            isExpanded={filtersExpanded}
            onToggleExpanded={setFiltersExpanded}
          />

          {/* Jobs For You Section */}
          {!loading && user && (
            <JobsForYouSection
              jobs={filteredJobs}
              savedJobIds={savedJobIds}
              onApply={handleApply}
              onRefer={handleRefer}
              onClubSync={handleClubSync}
              onToggleSave={toggleSaveJob}
              onViewAll={handleViewAllTopMatches}
              matchThreshold={85}
              maxJobs={5}
            />
          )}

          {/* Tabs */}
          <div ref={tabsRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="all">
                  All Jobs ({filteredJobs.length})
                </TabsTrigger>
                <TabsTrigger value="saved">
                  Saved Jobs ({savedJobs.length})
                </TabsTrigger>
              </TabsList>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Sort: {sortBy === "match" ? "Match %" : sortBy === "newest" ? "Newest" : "Salary"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card/95 backdrop-blur-xl border-border z-50" align="end">
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

            <TabsContent value="all" className="space-y-6">
              {loading ? (
                <div className={cn(
                  "grid gap-6 transition-all duration-300",
                  filtersExpanded 
                    ? "grid-cols-1 md:grid-cols-2" 
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-80 rounded-2xl bg-card/10 backdrop-blur-sm animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className={cn(
                  "grid gap-6 transition-all duration-300",
                  filtersExpanded 
                    ? "grid-cols-1 md:grid-cols-2" 
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {filteredJobs
                    .filter(job => 
                      job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      job.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      job.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map(job => (
                      <JobCard 
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
                        salary={job.convertedSalary || undefined} 
                        matchScore={job.matchScore ?? undefined} 
                        isSaved={savedJobIds.includes(job.id)}
                        isContinuous={job.isContinuous}
                        hiredCount={job.hiredCount}
                        targetHireCount={job.targetHireCount}
                        onApply={() => handleApply(job.title)} 
                        onRefer={() => handleRefer(job.id, job.title, job.company)} 
                        onClubSync={() => handleClubSync(job.title)} 
                        onToggleSave={() => toggleSaveJob(job.id, job.title)} 
                      />
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="saved" className="space-y-6">
              {loadingSavedJobs ? (
                <div className={cn(
                  "grid gap-6 transition-all duration-300",
                  filtersExpanded 
                    ? "grid-cols-1 md:grid-cols-2" 
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-80 rounded-2xl bg-card/10 backdrop-blur-sm animate-pulse" />
                  ))}
                </div>
              ) : savedJobs.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/20 flex items-center justify-center">
                    <Search className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">No saved jobs yet</h3>
                  <p className="text-muted-foreground">Start exploring and save opportunities that interest you</p>
                </div>
              ) : (
                <div className={cn(
                  "grid gap-6 transition-all duration-300",
                  filtersExpanded 
                    ? "grid-cols-1 md:grid-cols-2" 
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {savedJobs
                    .filter(job => 
                      job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      job.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      job.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map(job => (
                      <JobCard 
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
                        salary={job.convertedSalary || undefined} 
                        matchScore={job.matchScore ?? undefined} 
                        isSaved={true}
                        isContinuous={job.isContinuous}
                        hiredCount={job.hiredCount}
                        targetHireCount={job.targetHireCount}
                        onApply={() => handleApply(job.title)} 
                        onRefer={() => handleRefer(job.id, job.title, job.company)} 
                        onClubSync={() => handleClubSync(job.title)} 
                        onToggleSave={() => toggleSaveJob(job.id, job.title)} 
                      />
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          </div>
        </div>
      </div>

      {selectedJob && (
        <ReferralDialog 
          open={referralDialogOpen} 
          onOpenChange={setReferralDialogOpen} 
          jobId={selectedJob.id} 
          jobTitle={selectedJob.title} 
          companyName={selectedJob.company} 
        />
      )}
      
      <ClubSyncConfirmationDialog
        open={clubSyncDialogOpen}
        onOpenChange={setClubSyncDialogOpen}
        onConfirm={(preferences) => handleClubSyncToggle(true, preferences)}
        eligibleJobs={eligibleJobsForClubSync}
      />
      
      <AIPageCopilot 
        currentPage="/jobs" 
        contextData={{ jobsCount: jobs.length }}
        onAction={(action) => {
          if (action === 'search_jobs') navigate('/club-ai');
        }}
      />
    </AppLayout>
  );
};

export default Jobs;
