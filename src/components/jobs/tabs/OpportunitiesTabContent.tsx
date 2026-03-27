import { cn } from "@/lib/utils";
import { JobCard } from "@/components/JobCard";
import type { Currency } from "@/lib/currencyConversion";

export interface JobItem {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  companySlug?: string;
  location: string;
  type: string;
  postedDate: string;
  postedDaysAgo: number;
  tags: string[];
  matchScore?: number | null;
  salary: number;
  salaryMin: number;
  salaryMax: number;
  currency: Currency;
  isContinuous: boolean;
  hiredCount: number;
  targetHireCount?: number;
  convertedSalary?: string | null;
}

interface OpportunitiesTabContentProps {
  loading: boolean;
  filtersExpanded: boolean;
  filteredJobs: JobItem[];
  searchQuery: string;
  savedJobIds: string[];
  onApply: (title: string, id: string, company: string) => void;
  onRefer: (id: string, title: string, company: string) => void;
  onClubSync: (title: string) => void;
  onToggleSave: (id: string, title: string) => void;
}

export const OpportunitiesTabContent = ({
  loading,
  filtersExpanded,
  filteredJobs,
  searchQuery,
  savedJobIds,
  onApply,
  onRefer,
  onClubSync,
  onToggleSave
}: OpportunitiesTabContentProps) => {
  if (loading) {
    return (
      <div className={cn(
        "grid gap-6 transition-all duration-300",
        filtersExpanded ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-80 rounded-2xl bg-card/10 backdrop-blur-[var(--blur-glass-subtle)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-6 transition-all duration-300",
      filtersExpanded ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
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
            onApply={() => onApply(job.title, job.id, job.company)} 
            onRefer={() => onRefer(job.id, job.title, job.company)} 
            onClubSync={() => onClubSync(job.title)} 
            onToggleSave={() => onToggleSave(job.id, job.title)} 
          />
        ))}
    </div>
  );
};
