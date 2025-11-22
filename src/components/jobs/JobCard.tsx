import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    employment_type?: string;
    created_at: string;
    companies?: {
      name: string;
      logo_url?: string;
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
              {job.companies?.logo_url ? (
                <img
                  src={job.companies.logo_url}
                  alt={job.companies.name}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg leading-tight">{job.title}</h3>
                <p className="text-sm text-muted-foreground">{job.companies?.name}</p>
              </div>
            </div>
          </div>
          {job.employment_type && (
            <Badge variant="secondary">{job.employment_type}</Badge>
          )}
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
