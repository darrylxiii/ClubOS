import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, Share2, Briefcase, MapPin, Users, Globe } from "lucide-react";
import { JobActionButtons } from "./JobActionButtons";

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
    website_url?: string;
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
  // Calculate days open
  const daysOpen = job.created_at
    ? Math.floor((new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Card className="border-2 hover:border-primary transition-all hover-scale relative overflow-hidden group">
      {/* Hero Cover Image */}
      <div className="relative h-48 md:h-64 overflow-hidden bg-muted">
        {company.cover_image_url ? (
          <img
            src={company.cover_image_url}
            alt={company.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10" />
        )}
        
        {/* Logo Overlay */}
        <div className="absolute bottom-4 left-6">
          <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-background shadow-xl">
            <AvatarImage src={company.logo_url} alt={company.name} />
            <AvatarFallback className="text-2xl font-black bg-gradient-to-br from-primary to-accent text-white">
              {company.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Top-Right Actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button variant="secondary" size="sm" className="gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={onShare} className="gap-2">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="p-6 space-y-6">
        {/* Title + Subtitle */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground group-hover:text-primary transition-colors">
            {job.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">at {company.name}</p>
        </div>

        {/* Full Description */}
        {job.description && (
          <p className="text-foreground leading-relaxed">
            {job.description}
          </p>
        )}

        {/* Icon Stats Row */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" />
            <span>{job.employment_type}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{metrics.applicants} applicants</span>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-3">
          {company.website_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                <Globe className="w-4 h-4" />
                Website
              </a>
            </Button>
          )}
          <JobActionButtons
            isApplied={isApplied}
            isSaved={isSaved}
            onApply={onApply}
            onSave={onSave}
            onShare={onShare}
          />
        </div>

        {/* Bottom Metrics */}
        <div className="flex items-center justify-between text-sm border-t pt-4 gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{metrics.applicants}</span>
            <span className="text-muted-foreground">applied</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{daysOpen}</span>
            <span className="text-muted-foreground">days open</span>
          </div>
          {matchScore && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-green-500">{matchScore}%</span>
              <span className="text-muted-foreground">Match</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
