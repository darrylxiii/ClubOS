import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, DollarSign, Clock, Bookmark, Share2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { LocationMapCard } from "@/components/ui/location-map-card";

interface JobHeroProps {
  title: string;
  company: {
    name: string;
    slug?: string;
    logo_url?: string;
    cover_image_url?: string;
  };
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  matchScore?: number | null;
  isSaved?: boolean;
  isApplied?: boolean;
  onApply?: () => void;
  onSave?: () => void;
  onShare?: () => void;
}

export function JobHero({
  title,
  company,
  location,
  latitude,
  longitude,
  employment_type,
  salary_min,
  salary_max,
  currency = 'EUR',
  matchScore,
  isSaved,
  isApplied,
  onApply,
  onSave,
  onShare,
}: JobHeroProps) {
  const navigate = useNavigate();

  const formatSalary = () => {
    if (!salary_max) return null;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    
    if (salary_min && salary_min > 0) {
      return `${formatter.format(salary_min)} - ${formatter.format(salary_max)}`;
    }
    return `Up to ${formatter.format(salary_max)}`;
  };

  const getEmploymentTypeLabel = () => {
    const types: Record<string, string> = {
      fulltime: 'Full-time',
      parttime: 'Part-time',
      contract: 'Contract',
      freelance: 'Freelance',
    };
    return types[employment_type || ''] || employment_type;
  };

  return (
    <div className="relative">
      {/* Cover Image */}
      {company.cover_image_url && (
        <div className="absolute inset-x-0 top-0 h-64 overflow-hidden">
          <img 
            src={company.cover_image_url} 
            alt={`${company.name} cover`}
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      {/* Hero Content */}
      <div className="relative container mx-auto px-4 pt-12 pb-8">
        <div className="glass backdrop-blur-xl border-accent/30 rounded-2xl p-8 shadow-glass-xl">
          {/* Company Logo & Info */}
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <Avatar className="w-20 h-20 border-2 border-accent ring-4 ring-accent/20">
              <AvatarImage src={company.logo_url || undefined} className="object-contain" />
              <AvatarFallback className="text-2xl font-black bg-gradient-accent text-white">
                {company.name?.substring(0, 2).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              {/* Company Name */}
              <button
                onClick={() => company.slug && navigate(`/companies/${company.slug}`)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
              >
                {company.name}
                {company.slug && <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>

              {/* Job Title */}
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                {title}
              </h1>

              {/* Quick Info Badges */}
              <div className="flex flex-wrap items-center gap-3">
                {location && (
                  <Badge variant="secondary" className="gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {location}
                  </Badge>
                )}
                {employment_type && (
                  <Badge variant="secondary" className="gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    {getEmploymentTypeLabel()}
                  </Badge>
                )}
                {formatSalary() && (
                  <Badge variant="secondary" className="gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    {formatSalary()}
                  </Badge>
                )}
              </div>
            </div>

            {/* Match Score */}
            {matchScore !== null && matchScore !== undefined && (
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-accent">
                <div className="text-3xl font-black text-white">{matchScore}%</div>
                <div className="text-xs text-white/80 uppercase tracking-wider">Match</div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-6 border-t border-border/50">
            <Button
              onClick={onApply}
              disabled={isApplied}
              size="lg"
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
              onClick={onSave}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
              {isSaved ? 'Saved' : 'Save'}
            </Button>

            <Button
              onClick={onShare}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>

          {/* Location Map */}
          {latitude && longitude && (
            <div className="mt-6 pt-6 border-t border-border/50">
              <LocationMapCard
                latitude={latitude}
                longitude={longitude}
                label={company.name}
                address={location}
                size="card"
                className="max-w-md"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
