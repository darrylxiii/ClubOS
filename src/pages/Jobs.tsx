import { useState, useEffect } from "react";
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

  // Fetch jobs from database
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const {
          data,
          error
        } = await supabase.from('jobs').select(`
            id,
            title,
            location,
            employment_type,
            salary_min,
            salary_max,
            currency,
            created_at,
            company_id,
            companies (
              name,
              slug
            )
          `).eq('status', 'published').order('created_at', {
          ascending: false
        });
        if (error) throw error;

        // Transform data for display
        const transformedJobs = data?.map((job: any) => ({
          id: job.id,
          title: job.title,
          company: job.companies?.name || 'Unknown Company',
          companySlug: job.companies?.slug,
          location: job.location || 'Remote',
          type: job.employment_type || 'fulltime',
          postedDate: new Date(job.created_at).toLocaleDateString(),
          postedDaysAgo: Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          tags: ['Leadership', 'Innovation'],
          // TODO: Add tags to jobs table
          matchScore: Math.floor(Math.random() * 30) + 70,
          // TODO: Calculate real match score
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
  }, []);
  const sortedJobs = [...jobs].sort((a, b) => {
    switch (sortBy) {
      case "match":
        return b.matchScore - a.matchScore;
      case "newest":
        return a.postedDaysAgo - b.postedDaysAgo;
      case "salary":
        return b.salary - a.salary;
      default:
        return 0;
    }
  });
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

  // Convert salary for display
  const getConvertedSalary = (job: any) => {
    if (!job.salaryMax) return null;
    const convertedMin = convertCurrency(job.salaryMin || 0, job.currency, userCurrency);
    const convertedMax = convertCurrency(job.salaryMax, job.currency, userCurrency);
    return {
      min: convertedMin,
      max: convertedMax,
      formatted: `${formatCurrency(convertedMin, userCurrency, {
        compact: true
      })} - ${formatCurrency(convertedMax, userCurrency, {
        compact: true
      })}`
    };
  };
  const savedJobs = sortedJobs.filter(job => savedJobIds.includes(job.id));

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
      {/* Background Video */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-40">
          <source src="/videos/ocean-background.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8 space-y-6">
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
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border/20 bg-card/30 backdrop-blur-[var(--blur-glass)] shadow-[var(--shadow-glass-md)]">
                <Zap className={`w-5 h-5 ${clubSyncEnabled ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Club Sync</span>
                    <span className="text-xs text-muted-foreground">AUTO-APPLY</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically apply to all matches above 90%
                  </p>
                </div>
                <Switch checked={clubSyncEnabled} onCheckedChange={checked => {
                setClubSyncEnabled(checked);
                toast.success(checked ? "Club Sync enabled" : "Club Sync disabled", {
                  description: checked ? "You'll automatically apply to roles with 90%+ match" : "Auto-apply has been turned off"
                });
              }} />
              </div>
            </div>

            {/* Job Listings */}
            {loading ? <div className="text-center py-12">
                <p className="text-muted-foreground">Loading jobs...</p>
              </div> : sortedJobs.length === 0 ? <div className="text-center py-12">
                <p className="text-muted-foreground">No jobs available</p>
              </div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sortedJobs.map(job => {
              const convertedSalary = getConvertedSalary(job);
              return <JobCard key={job.id} title={job.title} company={job.company} location={job.location} type={job.type} postedDate={job.postedDate} tags={job.tags} salary={convertedSalary?.formatted} matchScore={job.matchScore} isSaved={savedJobIds.includes(job.id)} onApply={() => handleApply(job.title)} onRefer={() => handleRefer(job.id, job.title, job.company)} onClubSync={() => handleClubSync(job.title)} onToggleSave={() => toggleSaveJob(job.id, job.title)} />;
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
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border/20 bg-card/30 backdrop-blur-[var(--blur-glass)] shadow-[var(--shadow-glass-md)]">
                <Zap className={`w-5 h-5 ${clubSyncEnabled ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Club Sync</span>
                    <span className="text-xs text-muted-foreground">AUTO-APPLY</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically apply to all matches above 90%
                  </p>
                </div>
                <Switch checked={clubSyncEnabled} onCheckedChange={checked => {
                setClubSyncEnabled(checked);
                toast.success(checked ? "Club Sync enabled" : "Club Sync disabled", {
                  description: checked ? "You'll automatically apply to roles with 90%+ match" : "Auto-apply has been turned off"
                });
              }} />
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
              const convertedSalary = getConvertedSalary(job);
              return <JobCard key={job.id} title={job.title} company={job.company} location={job.location} type={job.type} postedDate={job.postedDate} tags={job.tags} salary={convertedSalary?.formatted} matchScore={job.matchScore} isSaved={true} onApply={() => handleApply(job.title)} onRefer={() => handleRefer(job.id, job.title, job.company)} onClubSync={() => handleClubSync(job.title)} onToggleSave={() => toggleSaveJob(job.id, job.title)} />;
            })}
              </div>}
          </TabsContent>
        </Tabs>

        {selectedJob && <ReferralDialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen} jobId={selectedJob.id} jobTitle={selectedJob.title} companyName={selectedJob.company} />}
      </div>
    </AppLayout>;
};
export default Jobs;