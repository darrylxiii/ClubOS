import { useState } from "react";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Search, SlidersHorizontal, Check, Zap } from "lucide-react";
import { toast } from "sonner";

type SortOption = "match" | "newest" | "salary";

const Jobs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [savedJobIds, setSavedJobIds] = useState<number[]>([]);
  const [clubSyncEnabled, setClubSyncEnabled] = useState(false);

  const jobs = [
    {
      id: 1,
      title: "Chief Executive Officer",
      company: "AI Infrastructure Fund",
      location: "Undisclosed",
      type: "Executive",
      postedDate: "3 days ago",
      postedDaysAgo: 3,
      tags: ["Leadership", "Venture-backed", "AI"],
      matchScore: 95,
      salary: 450000,
    },
    {
      id: 2,
      title: "VP Engineering",
      company: "Quantum Computing Lab",
      location: "Remote",
      type: "Executive",
      postedDate: "5 days ago",
      postedDaysAgo: 5,
      tags: ["Deep Tech", "Scale", "Innovation"],
      matchScore: 88,
      salary: 380000,
    },
    {
      id: 3,
      title: "Global Head of Design",
      company: "Luxury Tech Brand",
      location: "New York, NY",
      type: "Executive",
      postedDate: "1 week ago",
      postedDaysAgo: 7,
      tags: ["Design Leadership", "Brand", "UX"],
      matchScore: 76,
      salary: 320000,
    },
    {
      id: 4,
      title: "Chief Product Officer",
      company: "Next-Gen Platform",
      location: "San Francisco, CA",
      type: "Executive",
      postedDate: "2 days ago",
      postedDaysAgo: 2,
      tags: ["Product Strategy", "Growth", "Innovation"],
      matchScore: 92,
      salary: 420000,
    },
    {
      id: 5,
      title: "Head of AI Research",
      company: "Stealth Startup",
      location: "Remote",
      type: "Executive",
      postedDate: "4 days ago",
      postedDaysAgo: 4,
      tags: ["AI/ML", "Research", "PhD Required"],
      matchScore: 84,
      salary: 350000,
    },
    {
      id: 6,
      title: "Chief Revenue Officer",
      company: "SaaS Unicorn",
      location: "Undisclosed",
      type: "Executive",
      postedDate: "1 day ago",
      postedDaysAgo: 1,
      tags: ["Revenue", "Scale", "Enterprise"],
      matchScore: 91,
      salary: 400000,
    },
  ];

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
      description: "Your application has been submitted successfully.",
    });
  };

  const handleRefer = (jobTitle: string) => {
    toast.success(`Referral initiated for ${jobTitle}!`, {
      description: "Share this opportunity with your network to earn rewards.",
    });
  };

  const handleClubSync = (jobTitle: string) => {
    toast.success(`Club Sync activated for ${jobTitle}!`, {
      description: "Elite auto-apply initiated. You'll be notified of next steps.",
    });
  };

  const toggleSaveJob = (jobId: number, jobTitle: string) => {
    setSavedJobIds((prev) => {
      const isSaved = prev.includes(jobId);
      if (isSaved) {
        toast.info(`Removed ${jobTitle} from saved jobs`);
        return prev.filter((id) => id !== jobId);
      } else {
        toast.success(`Saved ${jobTitle}!`, {
          description: "You can view all saved jobs in the Saved tab.",
        });
        return [...prev, jobId];
      }
    });
  };

  const savedJobs = sortedJobs.filter((job) => savedJobIds.includes(job.id));

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4 border-b-2 border-foreground pb-8">
          <p className="text-caps text-muted-foreground">Curated Roles</p>
          <h1 className="text-hero">
            Elite
            <br />
            <span className="italic">Opportunities</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Invite-only roles curated exclusively for visionary talent
          </p>
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
                  <Input
                    type="text"
                    placeholder="Search jobs by title, company, or skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="shrink-0">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Sort by: {sortBy === "match" ? "Match %" : sortBy === "newest" ? "Newest" : "Salary"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-background border-border z-50" align="end">
                    <DropdownMenuItem 
                      onClick={() => setSortBy("match")}
                      className="cursor-pointer"
                    >
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "match" ? "opacity-100" : "opacity-0"}`} />
                      Match %
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("newest")}
                      className="cursor-pointer"
                    >
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "newest" ? "opacity-100" : "opacity-0"}`} />
                      Newest
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("salary")}
                      className="cursor-pointer"
                    >
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "salary" ? "opacity-100" : "opacity-0"}`} />
                      Salary (High to Low)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Club Sync Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
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
                <Switch
                  checked={clubSyncEnabled}
                  onCheckedChange={(checked) => {
                    setClubSyncEnabled(checked);
                    toast.success(checked ? "Club Sync enabled" : "Club Sync disabled", {
                      description: checked 
                        ? "You'll automatically apply to roles with 90%+ match" 
                        : "Auto-apply has been turned off"
                    });
                  }}
                />
              </div>
            </div>

            {/* Job Listings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  title={job.title}
                  company={job.company}
                  location={job.location}
                  type={job.type}
                  postedDate={job.postedDate}
                  tags={job.tags}
                  matchScore={job.matchScore}
                  isSaved={savedJobIds.includes(job.id)}
                  onApply={() => handleApply(job.title)}
                  onRefer={() => handleRefer(job.title)}
                  onClubSync={() => handleClubSync(job.title)}
                  onToggleSave={() => toggleSaveJob(job.id, job.title)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search saved jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="shrink-0">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Sort by: {sortBy === "match" ? "Match %" : sortBy === "newest" ? "Newest" : "Salary"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-background border-border z-50" align="end">
                    <DropdownMenuItem 
                      onClick={() => setSortBy("match")}
                      className="cursor-pointer"
                    >
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "match" ? "opacity-100" : "opacity-0"}`} />
                      Match %
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("newest")}
                      className="cursor-pointer"
                    >
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "newest" ? "opacity-100" : "opacity-0"}`} />
                      Newest
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy("salary")}
                      className="cursor-pointer"
                    >
                      <Check className={`w-4 h-4 mr-2 ${sortBy === "salary" ? "opacity-100" : "opacity-0"}`} />
                      Salary (High to Low)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Club Sync Toggle */}
              <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
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
                <Switch
                  checked={clubSyncEnabled}
                  onCheckedChange={(checked) => {
                    setClubSyncEnabled(checked);
                    toast.success(checked ? "Club Sync enabled" : "Club Sync disabled", {
                      description: checked 
                        ? "You'll automatically apply to roles with 90%+ match" 
                        : "Auto-apply has been turned off"
                    });
                  }}
                />
              </div>
            </div>

            {/* Saved Job Listings */}
            {savedJobs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No saved jobs yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click the bookmark icon on any job to save it here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {savedJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    title={job.title}
                    company={job.company}
                    location={job.location}
                    type={job.type}
                    postedDate={job.postedDate}
                    tags={job.tags}
                    matchScore={job.matchScore}
                    isSaved={true}
                    onApply={() => handleApply(job.title)}
                    onRefer={() => handleRefer(job.title)}
                    onClubSync={() => handleClubSync(job.title)}
                    onToggleSave={() => toggleSaveJob(job.id, job.title)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Jobs;
