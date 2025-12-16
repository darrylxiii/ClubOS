import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CompanyLogo } from "@/components/ui/company-logo";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    employment_type?: string;
    created_at: string;
    is_stealth?: boolean;
    companies?: {
      name: string;
      logo_url?: string;
      website_url?: string;
    } | null;
  };
}

export function JobCard({ job }: JobCardProps) {
  const daysAgo = Math.floor(
    (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <CompanyLogo 
                company={job.companies} 
                size="md" 
                autoFetch={true}
              />
              <div>
                <h3 className="font-semibold text-lg leading-tight">{job.title}</h3>
                <p className="text-sm text-muted-foreground">{job.companies?.name}</p>
              </div>
            </div>
        </div>
          <div className="flex items-center gap-2">
            {job.is_stealth && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                      <Lock className="h-3 w-3" />
                      Confidential
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This job is only visible to selected users</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {job.employment_type && (
              <Badge variant="secondary">{job.employment_type}</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {job.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {job.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{job.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>
          </div>
        </div>

        <Button asChild className="w-full">
          <Link to={`/jobs/${job.id}`}>View Details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
