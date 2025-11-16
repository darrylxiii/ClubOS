import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Briefcase, Users, Eye, Share2, Globe, ChevronDown, TrendingUp, Calendar, Clock, Send, Bookmark } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { T } from "@/components/T";
import { useTranslation } from "react-i18next";

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
  const [isOpen, setIsOpen] = useState(false);
  
  const daysOpen = job.created_at
    ? Math.floor((new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 hover:border-primary transition-all relative overflow-hidden group hover-scale">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-4">
            {/* Cover Image Background (collapsed state) */}
            <div className="absolute top-0 left-0 right-0 h-32 overflow-hidden opacity-20">
              {company?.cover_image_url && (
                <img
                  src={company.cover_image_url}
                  alt={company.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="relative flex items-start justify-between gap-4">
              {/* Logo + Title Section */}
              <div className="flex items-start gap-4 flex-1">
                {/* Company Logo */}
                <Avatar className="w-20 h-20 border-4 border-background shadow-lg flex-shrink-0">
                  <AvatarImage src={company?.logo_url} alt={company?.name} />
                  <AvatarFallback className="bg-primary/10">
                    <Building2 className="w-10 h-10 text-primary" />
                  </AvatarFallback>
                </Avatar>

                {/* Job Title & Company Name */}
                <div className="flex-1 text-left pt-2">
                  <h1 className="text-2xl md:text-3xl font-black mb-1">{job.title}</h1>
                  <p className="text-sm text-muted-foreground">at {company?.name}</p>

                  {/* Quick Stats Bar */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />
                      <span>{job.employment_type || 'Full-time'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location || 'Remote'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{metrics?.applicants || 0} applied</span>
                    </div>
                    {matchScore && (
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold text-green-500">{matchScore}% Match</span>
                      </div>
                    )}
                  </div>

                  {/* Metrics Preview */}
                  <div className="flex flex-wrap items-center gap-6 mt-3 text-sm">
                    <div>
                      <span className="text-2xl font-black text-foreground">{metrics?.applicants || 0}</span>
                      <span className="text-muted-foreground ml-2">applied</span>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-foreground">{daysOpen}</span>
                      <span className="text-muted-foreground ml-2">days open</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chevron Icon */}
              <ChevronDown
                className={cn(
                  "w-6 h-6 transition-transform flex-shrink-0 mt-2",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="border-t pt-6 space-y-6">
            {/* Detailed Analytics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                <Eye className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-xl font-bold mb-1">{metrics?.views || 156}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Profile Views</div>
              </div>
              <div className="text-center p-4 rounded-lg border-2 border-accent/20 bg-accent/5">
                <Users className="w-6 h-6 mx-auto mb-2 text-accent" />
                <div className="text-xl font-bold mb-1">{metrics?.applicants || 0}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Applications</div>
              </div>
              <div className="text-center p-4 rounded-lg border-2 border-chart-2/20 bg-chart-2/5">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-chart-2" />
                <div className="text-xl font-bold mb-1">{daysOpen}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Days Open</div>
              </div>
              <div className="text-center p-4 rounded-lg border-2 border-muted/20 bg-muted/5">
                <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <div className="text-xl font-bold mb-1">{metrics.timeToHire || '~2 wks'}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Time to Hire</div>
              </div>
            </div>

            {/* Full Description */}
            {job.description && (
              <div>
                <h3 className="text-xl font-bold mb-3">About the Role</h3>
                <p className="text-foreground/90 leading-relaxed">
                  {job.description.split('\n').map((paragraph, index) => (
                    <span key={index}>
                      {paragraph}
                      {index < job.description!.split('\n').length - 1 && <><br /><br /></>}
                    </span>
                  ))}
                </p>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-3">
              {company?.website_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={company.website_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" /> Website
                  </a>
                </Button>
              )}
              <Button
                onClick={onApply}
                disabled={isApplied}
                size="sm"
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {isApplied ? 'Applied' : 'Apply Now'}
              </Button>
              <Button
                onClick={onSave}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save Job'}
              </Button>
              <Button
                onClick={onShare}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Share2 className="w-4 h-4" /> Share
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
