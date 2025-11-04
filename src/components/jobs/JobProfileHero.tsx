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
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
    <div className="relative">
      {/* Cover Image Header */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-primary/20 via-accent/10 to-background">
        {company.cover_image_url && (
          <img 
            src={company.cover_image_url} 
            alt={`${company.name} cover`}
            className="w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="absolute top-4 right-4 gap-2 frosted-glass"
          >
            <Camera className="w-4 h-4" />
            Change Header
          </Button>
        )}
      </div>

      {/* Main Content Card */}
      <div className="container mx-auto px-6 relative">
        <Card className="border-2 -mt-20 relative">
          <CardContent className="p-6">
            {/* Company Logo - Overlapping Avatar */}
            <div
              className="absolute -top-16 left-6"
              onMouseEnter={() => setIsHoveringAvatar(true)}
              onMouseLeave={() => setIsHoveringAvatar(false)}
            >
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-background shadow-lg ring-4 ring-accent/20">
                  <AvatarImage src={company.logo_url || undefined} className="object-contain p-2" />
                  <AvatarFallback className="text-3xl font-black bg-gradient-accent text-white">
                    {company.name?.substring(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                
                {isAdmin && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: isHoveringAvatar ? 1 : 0, scale: isHoveringAvatar ? 1 : 0.8 }}
                    className="absolute -bottom-2 -right-2"
                  >
                    <Button size="icon" variant="outline" className="rounded-full h-10 w-10 frosted-glass">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Top Section with Company Name and Title */}
            <div className="pl-40 min-h-20 flex flex-col justify-center">
              <button
                onClick={() => company.slug && navigate(`/companies/${company.slug}`)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group w-fit"
              >
                {company.name}
                {company.slug && <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>

              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-3xl font-bold">{job.title}</h1>
                
                {job.status === 'draft' && isAdmin && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    Draft
                  </Badge>
                )}
                
                {job.match_score !== null && job.match_score !== undefined && (
                  <Badge className="bg-gradient-accent text-white border-0">
                    {job.match_score}% Match
                  </Badge>
                )}
              </div>

              {company.tagline && (
                <p className="text-muted-foreground mt-2">{company.tagline}</p>
              )}
            </div>

            {/* Quick Info Bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6 pb-6 border-b text-sm">
              {job.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{job.location}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                <span>{getEmploymentTypeLabel()}</span>
              </div>

              {formatSalary() && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>{formatSalary()}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{daysAgo === 0 ? 'Posted today' : `Posted ${daysAgo}d ago`}</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap gap-3 mt-6">
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
                onClick={onSave}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
                {isSaved ? 'Saved' : 'Save Job'}
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

              {company.slug && (
                <Button
                  onClick={() => navigate(`/companies/${company.slug}`)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Company
                </Button>
              )}
            </div>

            {/* Stats Bar */}
            {metrics && (
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                    <Users className="w-5 h-5 text-primary" />
                    {metrics.applicants}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Applicants</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                    <Eye className="w-5 h-5 text-primary" />
                    {metrics.views}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Views</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                    <Calendar className="w-5 h-5 text-primary" />
                    {metrics.daysOpen}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Days Open</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
