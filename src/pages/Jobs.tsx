import { useState } from "react";
import { Layout } from "@/components/Layout";
import { JobCard } from "@/components/JobCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

const Jobs = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const jobs = [
    {
      id: 1,
      title: "Chief Executive Officer",
      company: "AI Infrastructure Fund",
      location: "Undisclosed",
      type: "Executive",
      postedDate: "3 days ago",
      tags: ["Leadership", "Venture-backed", "AI"],
      matchScore: 95,
    },
    {
      id: 2,
      title: "VP Engineering",
      company: "Quantum Computing Lab",
      location: "Remote",
      type: "Executive",
      postedDate: "5 days ago",
      tags: ["Deep Tech", "Scale", "Innovation"],
      matchScore: 88,
    },
    {
      id: 3,
      title: "Global Head of Design",
      company: "Luxury Tech Brand",
      location: "New York, NY",
      type: "Executive",
      postedDate: "1 week ago",
      tags: ["Design Leadership", "Brand", "UX"],
      matchScore: 76,
    },
    {
      id: 4,
      title: "Chief Product Officer",
      company: "Next-Gen Platform",
      location: "San Francisco, CA",
      type: "Executive",
      postedDate: "2 days ago",
      tags: ["Product Strategy", "Growth", "Innovation"],
      matchScore: 92,
    },
    {
      id: 5,
      title: "Head of AI Research",
      company: "Stealth Startup",
      location: "Remote",
      type: "Executive",
      postedDate: "4 days ago",
      tags: ["AI/ML", "Research", "PhD Required"],
      matchScore: 84,
    },
    {
      id: 6,
      title: "Chief Revenue Officer",
      company: "SaaS Unicorn",
      location: "Undisclosed",
      type: "Executive",
      postedDate: "1 day ago",
      tags: ["Revenue", "Scale", "Enterprise"],
      matchScore: 91,
    },
  ];

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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-gradient-accent blur-3xl opacity-20 rounded-full"></div>
          <h1 className="text-3xl font-bold mb-2 relative">
            Elite <span className="text-accent">Opportunities</span>
          </h1>
          <p className="text-muted-foreground italic">
            Invite-only roles curated exclusively for visionary talent
          </p>
        </div>

        {/* Search and Filters */}
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
          <Button variant="outline" className="shrink-0">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Job Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              title={job.title}
              company={job.company}
              location={job.location}
              type={job.type}
              postedDate={job.postedDate}
              tags={job.tags}
              matchScore={job.matchScore}
              onApply={() => handleApply(job.title)}
              onRefer={() => handleRefer(job.title)}
              onClubSync={() => handleClubSync(job.title)}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Jobs;
