import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PipelineStageData } from "@/components/ExpandablePipelineStage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, DollarSign, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Application {
  id: string;
  job_id: string;
  company_name: string;
  position: string;
  current_stage_index: number;
  stages: PipelineStageData[];
  status: string;
  applied_at: string;
  job: {
    title: string;
    location: string;
    salary_min?: number;
    salary_max?: number;
    currency?: string;
    companies: {
      name: string;
      logo_url: string;
    };
  };
  other_candidates_count: number;
}

interface MobileApplicationPipelineProps {
  applications: Application[];
  onSelectApplication: (app: Application) => void;
}

export function MobileApplicationPipeline({
  applications,
  onSelectApplication,
}: MobileApplicationPipelineProps) {
  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <Card
          key={app.id}
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onSelectApplication(app)}
          data-testid="application-card"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 border-2 border-border/20">
                <AvatarImage src={app.job.companies.logo_url} alt={app.company_name} />
                <AvatarFallback>
                  <Building2 className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold truncate" data-testid="job-title">
                  {app.position}
                </CardTitle>
                <p className="text-sm text-muted-foreground truncate" data-testid="company-name">
                  {app.company_name}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{app.job.location}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Current Stage */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Stage:</span>
              <Badge variant="secondary" className="font-medium" data-testid="status">
                {app.stages[app.current_stage_index]?.title || "Applied"}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(((app.current_stage_index + 1) / app.stages.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((app.current_stage_index + 1) / app.stages.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Stage List - Vertical */}
            <div className="space-y-2 pt-2" data-testid="pipeline-stages">
              {app.stages.map((stage, index) => {
                const isPast = index < app.current_stage_index;
                const isCurrent = index === app.current_stage_index;
                const isFuture = index > app.current_stage_index;

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      isCurrent && "bg-primary/10 border border-primary/20",
                      isPast && "opacity-60"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-full shrink-0 transition-colors",
                        isCurrent && "bg-primary text-primary-foreground",
                        isPast && "bg-primary/20 text-primary",
                        isFuture && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isPast ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isCurrent && "text-primary"
                      )}>
                        {stage.title}
                      </p>
                      {stage.scheduledDate && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(stage.scheduledDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Additional Info */}
            <div className="flex items-center justify-between pt-2 border-t border-border/20 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{app.other_candidates_count} candidates</span>
              </div>
              {app.job.salary_min && app.job.salary_max && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>
                    {app.job.currency || "$"}
                    {app.job.salary_min / 1000}k-{app.job.salary_max / 1000}k
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
