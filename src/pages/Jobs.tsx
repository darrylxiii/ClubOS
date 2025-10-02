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
      title: "Full Stack Developer",
      company: "InnovateTech",
      location: "New York, NY",
      type: "Full-time",
      postedDate: "3 days ago",
      tags: ["React", "Node.js", "MongoDB"],
    },
    {
      id: 2,
      title: "Product Manager",
      company: "StartupCo",
      location: "Remote",
      type: "Full-time",
      postedDate: "5 days ago",
      tags: ["Agile", "Product Strategy", "Roadmap"],
    },
    {
      id: 3,
      title: "Data Scientist",
      company: "DataWorks",
      location: "Boston, MA",
      type: "Full-time",
      postedDate: "1 week ago",
      tags: ["Python", "Machine Learning", "SQL"],
    },
    {
      id: 4,
      title: "DevOps Engineer",
      company: "CloudScale",
      location: "Austin, TX",
      type: "Contract",
      postedDate: "2 days ago",
      tags: ["AWS", "Docker", "Kubernetes"],
    },
    {
      id: 5,
      title: "UX Researcher",
      company: "UserFirst",
      location: "Seattle, WA",
      type: "Full-time",
      postedDate: "4 days ago",
      tags: ["User Testing", "Research", "Analytics"],
    },
    {
      id: 6,
      title: "Backend Engineer",
      company: "ScaleSystems",
      location: "San Francisco, CA",
      type: "Full-time",
      postedDate: "1 day ago",
      tags: ["Go", "PostgreSQL", "Microservices"],
    },
  ];

  const handleApply = (jobTitle: string) => {
    toast.success(`Applied to ${jobTitle}!`, {
      description: "Your application has been submitted successfully.",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Browse Jobs</h1>
          <p className="text-muted-foreground">
            Discover opportunities that match your skills
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
              onApply={() => handleApply(job.title)}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Jobs;
