import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobCard } from "@/components/JobCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  companySlug?: string;
  location: string;
  type: string;
  postedDate: string;
  tags: string[];
  matchScore?: number | null;
  convertedSalary?: string | null;
  isContinuous?: boolean;
  hiredCount?: number;
  targetHireCount?: number | null;
}

interface JobsForYouSectionProps {
  jobs: Job[];
  savedJobIds: string[];
  onApply: (title: string) => void;
  onRefer: (id: string, title: string, company: string) => void;
  onClubSync: (title: string) => void;
  onToggleSave: (id: string, title: string) => void;
  matchThreshold?: number;
  maxJobs?: number;
}

export function JobsForYouSection({
  jobs,
  savedJobIds,
  onApply,
  onRefer,
  onClubSync,
  onToggleSave,
  matchThreshold = 85,
  maxJobs = 5,
}: JobsForYouSectionProps) {
  const topMatches = useMemo(() => {
    return jobs
      .filter((job) => job.matchScore && job.matchScore >= matchThreshold)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, maxJobs);
  }, [jobs, matchThreshold, maxJobs]);

  if (topMatches.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Jobs For You
              <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {matchThreshold}%+ match
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Top matches based on your profile
            </p>
          </div>
        </div>
        {topMatches.length > 3 && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            View all
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Horizontal Scroll for Mobile, Grid for Desktop */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {topMatches.slice(0, 3).map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="relative"
          >
            {index === 0 && (
              <div className="absolute -top-2 -left-2 z-10">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg">
                  <Star className="w-3 h-3 fill-current" />
                  Best Match
                </div>
              </div>
            )}
            <JobCard
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
              onApply={() => onApply(job.title)}
              onRefer={() => onRefer(job.id, job.title, job.company)}
              onClubSync={() => onClubSync(job.title)}
              onToggleSave={() => onToggleSave(job.id, job.title)}
            />
          </motion.div>
        ))}
      </div>

      {/* Mobile Carousel */}
      <div className="md:hidden">
        <ScrollArea className="w-full whitespace-nowrap pb-4">
          <div className="flex gap-4">
            {topMatches.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  "relative shrink-0 w-[300px]",
                  index === 0 && "ml-0"
                )}
              >
                {index === 0 && (
                  <div className="absolute -top-2 -left-2 z-10">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg">
                      <Star className="w-3 h-3 fill-current" />
                      Best Match
                    </div>
                  </div>
                )}
                <JobCard
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
                  onApply={() => onApply(job.title)}
                  onRefer={() => onRefer(job.id, job.title, job.company)}
                  onClubSync={() => onClubSync(job.title)}
                  onToggleSave={() => onToggleSave(job.id, job.title)}
                />
              </motion.div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </motion.section>
  );
}
