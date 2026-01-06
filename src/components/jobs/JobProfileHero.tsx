import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Calendar,
  Bookmark,
  Share2,
  Clock,
  Eye,
  Users,
  Settings,
  Camera,
  ExternalLink,
  Repeat
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContinuousPipelineBadge } from "./ContinuousPipelineBadge";

interface JobProfileHeroProps {
  job: {
    id: string;
    title: string;
    location?: string;
    employment_type?: string;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    created_at: string;
    status?: string;
    match_score?: number | null;
    is_continuous?: boolean;
    hired_count?: number;
    target_hire_count?: number | null;
  };
  company: {
    name: string;
    slug?: string;
    logo_url?: string;
    cover_image_url?: string;
    tagline?: string;
  };
  metrics?: {
    applicants: number;
    views: number;
    daysOpen: number;
  };
  isSaved?: boolean;
  isApplied?: boolean;
  isAdmin?: boolean;
  onApply?: () => void;
  onSave?: () => void;
  onShare?: () => void;
}

export function JobProfileHero({
  job,
  company,
  metrics,
  isSaved,
  isApplied,
  isAdmin,
  onApply,
  onSave,
  onShare,
}: JobProfileHeroProps) {
  const navigate = useNavigate();
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);

  const formatSalary = () => {
    if (!job.salary_max) return null;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: job.currency || 'EUR',
      maximumFractionDigits: 0,
    });
    
    if (job.salary_min && job.salary_min > 0) {
      return `${formatter.format(job.salary_min)} - ${formatter.format(job.salary_max)}`;
    }
    return `Up to ${formatter.format(job.salary_max)}`;
  };

  const getEmploymentTypeLabel = () => {
    const types: Record<string, string> = {
      fulltime: 'Full-time',
      parttime: 'Part-time',
      contract: 'Contract',
      freelance: 'Freelance',
    };
    return types[job.employment_type || ''] || job.employment_type || 'Full-time';
  };

  const daysAgo = Math.floor(
    (new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="relative overflow-visible">
      {/* Header Media (Cover Image) */}
      <div className="relative w-full h-64 overflow-hidden bg-muted rounded-t-lg">
        {company.cover_image_url ? (
          <>
            <img
              src={company.cover_image_url}
              alt={`${company.name} header`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
          </>
        ) : null}

        {/* Change Header button in top right (only for admins) */}
        {isAdmin && (
          <div className="absolute top-4 right-4">
            <Button size="sm" variant="secondary" className="gap-2 shadow-lg">
              <Camera className="w-4 h-4" />
              Change Header
            </Button>
          </div>
        )}
      </div>

      {/* Avatar positioned to overlap header and content */}
      <div 
        className="absolute top-64 left-6 transform -translate-y-1/2 z-10"
        onMouseEnter={() => setIsHoveringAvatar(true)}
        onMouseLeave={() => setIsHoveringAvatar(false)}
      >
        <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
          <AvatarImage 
            src={company.logo_url || undefined}
            className="object-contain w-full h-full"
            alt={company.name}
          />
          <AvatarFallback className="text-4xl font-black bg-gradient-to-br from-primary to-accent text-white">
            {company.name?.substring(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>
        {isAdmin && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-0 right-0 rounded-full h-10 w-10 p-0 shadow-lg"
          >
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </div>

      <CardContent className="pt-20 px-6 pb-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <button
                onClick={() => company.slug && navigate(`/companies/${company.slug}`)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group w-fit"
              >
                {company.name}
                {company.slug && <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>

              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold">{job.title}</h1>
                {job.status === 'draft' && isAdmin && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    Draft
                  </Badge>
                )}
                <ContinuousPipelineBadge
                  isContinuous={job.is_continuous}
                  hiredCount={job.hired_count || 0}
                  targetHireCount={job.target_hire_count}
                  size="md"
                  showProgress={true}
                />
                {job.match_score !== null && job.match_score !== undefined && (
                  <Badge className="bg-gradient-to-r from-primary to-accent text-white">
                    {job.match_score}% Match
                  </Badge>
                )}
              </div>

              {company.tagline && (
                <p className="text-muted-foreground">{company.tagline}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={onApply}
                disabled={isApplied}
                size="sm"
                className="gap-2"
              >
                {isApplied ? (
                  <>
                    <Clock className="w-4 h-4" />
                    Applied
                  </>
                ) : (
                  'Apply Now'
                )}
              </Button>
              <Button
                onClick={onShare}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {job.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              {getEmploymentTypeLabel()}
            </div>
            {formatSalary() && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {formatSalary()}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {daysAgo === 0 ? 'Posted today' : `Posted ${daysAgo}d ago`}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onSave}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
              {isSaved ? 'Saved' : 'Save Job'}
            </Button>

            {company.slug && (
              <Button
                onClick={() => navigate(`/companies/${company.slug}`)}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Company
              </Button>
            )}
          </div>

          {/* Stats Bar */}
          {metrics && (
            <div className="flex items-center gap-6 pt-4 border-t">
              <div>
                <p className="text-2xl font-bold">{metrics.applicants}</p>
                <p className="text-xs text-muted-foreground">Applicants</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.views}</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.daysOpen}</p>
                <p className="text-xs text-muted-foreground">Days Open</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
