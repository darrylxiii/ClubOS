import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { JobQuickStats } from "./JobQuickStats";
import { JobMetricsGrid } from "./JobMetricsGrid";
import { JobActionButtons } from "./JobActionButtons";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface JobDetailCardProps {
  job: {
    title: string;
    location: string;
    employment_type: string;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    created_at?: string;
    description?: string;
  };
  company: {
    name: string;
    slug?: string;
    logo_url?: string;
    cover_image_url?: string;
  };
  matchScore?: number;
  isSaved: boolean;
  isApplied: boolean;
  onApply: () => void;
  onSave: () => void;
  onShare: () => void;
  metrics?: {
    applicants: number;
    views: number;
    timeToHire?: string;
  };
}

export function JobDetailCard({
  job,
  company,
  matchScore,
  isSaved,
  isApplied,
  onApply,
  onSave,
  onShare,
  metrics = { applicants: 0, views: 0, timeToHire: "~2 weeks" }
}: JobDetailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate days open
  const daysOpen = job.created_at
    ? Math.floor((new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border-2 hover:border-primary transition-all hover-scale relative overflow-hidden group">
        {/* Cover Image Header - Optional */}
        {company.cover_image_url && (
          <div
            className="absolute top-0 left-0 right-0 h-32 opacity-20 group-hover:opacity-30 transition-opacity"
            style={{
              backgroundImage: `url(${company.cover_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}

        {/* Card Header - Always Visible (CollapsibleTrigger) */}
        <CollapsibleTrigger className="w-full text-left">
          <CardContent className="p-6 space-y-4 relative z-10">
            <div className="flex items-start gap-4">
              {/* Company Logo */}
              <Avatar className="w-20 h-20 border-2 border-primary shadow-lg flex-shrink-0">
                <AvatarImage src={company.logo_url} alt={company.name} />
                <AvatarFallback className="text-2xl font-black bg-gradient-to-br from-primary to-accent text-white">
                  {company.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Job Title & Company Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-foreground group-hover:text-primary transition-colors">
                      {job.title}
                    </h1>
                    <p className="text-sm text-muted-foreground">{company.name}</p>
                  </div>

                  {/* Chevron Icon */}
                  <ChevronDown
                    className={cn(
                      "w-6 h-6 text-muted-foreground transition-transform flex-shrink-0",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>

                {/* Quick Stats Bar */}
                <JobQuickStats
                  location={job.location}
                  salaryMin={job.salary_min}
                  salaryMax={job.salary_max}
                  currency={job.currency}
                  employmentType={job.employment_type}
                  daysOpen={daysOpen}
                />

                {/* Metrics Preview */}
                <div className="flex flex-wrap items-center gap-3">
                  {matchScore && (
                    <Badge className="bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500">
                      {matchScore}% Match
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    👥 {metrics.applicants} applied
                  </span>
                  <span className="text-xs text-muted-foreground">
                    👀 {metrics.views} views
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ⏰ {metrics.timeToHire}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        {/* Collapsible Content - Expanded Details */}
        <CollapsibleContent>
          <CardContent className="px-6 pb-6 space-y-6 border-t border-border/50">
            {/* Detailed Metrics Grid */}
            <JobMetricsGrid
              applicants={metrics.applicants}
              views={metrics.views}
              daysOpen={daysOpen}
              timeToHire={metrics.timeToHire || "~2 weeks"}
              matchScore={matchScore}
            />

            {/* About the Role - Editorial excerpt */}
            {job.description && (
              <div>
                <h3 className="text-lg font-bold mb-3">About the Role</h3>
                <p className="text-foreground/90 leading-relaxed line-clamp-3">
                  {job.description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <JobActionButtons
              isApplied={isApplied}
              isSaved={isSaved}
              onApply={onApply}
              onSave={onSave}
              onShare={onShare}
            />

            {/* View Full Details hint */}
            <div className="text-center pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                Scroll down for full job details ↓
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
