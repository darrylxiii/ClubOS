import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { JobCard } from "@/components/JobCard";
import { Search } from "lucide-react";
import type { JobItem } from "./OpportunitiesTabContent";

interface SavedJobsTabContentProps {
  loadingSavedJobs: boolean;
  filtersExpanded: boolean;
  savedJobs: JobItem[];
  searchQuery: string;
  onApply: (title: string, id: string, company: string) => void;
  onRefer: (id: string, title: string, company: string) => void;
  onClubSync: (title: string) => void;
  onToggleSave: (id: string, title: string) => void;
}

export const SavedJobsTabContent = ({
  loadingSavedJobs,
  filtersExpanded,
  savedJobs,
  searchQuery,
  onApply,
  onRefer,
  onClubSync,
  onToggleSave
}: SavedJobsTabContentProps) => {
  const { t } = useTranslation("jobs");
  if (loadingSavedJobs) {
    return (
      <div className={cn(
        "grid gap-6 transition-all duration-300",
        filtersExpanded ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-80 rounded-2xl bg-card/10 backdrop-blur-[var(--blur-glass-subtle)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (savedJobs.length === 0) {
    return (
      <div className="text-center py-16">
        <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-1">{t("empty.noSavedJobs", "No saved jobs")}</h3>
        <p className="text-sm text-muted-foreground">{t("empty.browseSaveDescription", "Browse opportunities and save roles that interest you")}</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-6 transition-all duration-300",
      filtersExpanded ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
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
            onApply={() => onApply(job.title, job.id, job.company)} 
            onRefer={() => onRefer(job.id, job.title, job.company)} 
            onClubSync={() => onClubSync(job.title)} 
            onToggleSave={() => onToggleSave(job.id, job.title)} 
          />
        ))}
    </div>
  );
};
