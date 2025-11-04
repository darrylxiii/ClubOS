import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  MapPin, 
  DollarSign, 
  Building2,
  AlertCircle,
  TrendingUp,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RejectedApplication {
  id: string;
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
  applied_at: string;
  updated_at: string;
  current_stage_index: number;
  stages: any[];
}

interface Props {
  applications: RejectedApplication[];
}

export function RejectedApplicationsTab({ applications }: Props) {
  const calculateDaysInPipeline = (appliedAt: string, rejectedAt: string) => {
    const start = new Date(appliedAt);
    const end = new Date(rejectedAt);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatSalaryRange = (app: RejectedApplication) => {
    if (!app.job?.salary_min || !app.job?.salary_max) return null;
    const currency = app.job?.currency || 'EUR';
    return `${currency} ${app.job.salary_min.toLocaleString()} - ${app.job.salary_max.toLocaleString()}`;
  };

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="w-16 h-16 text-muted-foreground/30" />
            <div>
              <p className="text-lg font-medium">No Rejected Applications</p>
              <p className="text-sm text-muted-foreground mt-1">
                You don't have any rejected applications yet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">About Rejected Applications</p>
              <p className="text-xs text-muted-foreground">
                Every rejection is a learning opportunity. Review these applications to understand what to improve for future opportunities. 
                The Quantum Club is here to help you grow and succeed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rejected Applications List */}
      {applications.map((application) => {
        const rejectedStage = application.stages[application.current_stage_index];
        const daysInPipeline = calculateDaysInPipeline(application.applied_at, application.updated_at);
        
        return (
          <Card key={application.id} className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                {application.job?.companies?.logo_url && (
                  <Avatar className="w-14 h-14 border border-border/30 flex-shrink-0">
                    <AvatarImage src={application.job.companies.logo_url} />
                    <AvatarFallback className="bg-muted">
                      {application.job?.companies?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl mb-2 flex items-center gap-2">
                    {application.job?.title}
                    <Badge variant="destructive" className="ml-2">Rejected</Badge>
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" />
                      {application.job?.companies?.name}
                    </div>
                    {application.job?.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {application.job.location}
                      </div>
                    )}
                    {formatSalaryRange(application) && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4" />
                        {formatSalaryRange(application)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Separator />

              {/* Timeline Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Applied
                  </p>
                  <p className="font-medium">
                    {new Date(application.applied_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Rejected
                  </p>
                  <p className="font-medium">
                    {new Date(application.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Time in Process
                  </p>
                  <p className="font-medium">
                    {daysInPipeline} {daysInPipeline === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Pipeline Visualization */}
              <div>
                <p className="text-xs font-medium mb-3 text-muted-foreground uppercase tracking-wide">
                  Your Journey
                </p>
                <div className="flex items-center justify-between overflow-x-auto pb-2">
                  {application.stages.map((stage, idx) => (
                    <div key={idx} className="flex items-center flex-shrink-0">
                      <div className="flex flex-col items-center min-w-[80px]">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all text-sm font-semibold",
                            idx < application.current_stage_index
                              ? "bg-muted border-muted-foreground/30 text-foreground"
                              : idx === application.current_stage_index
                              ? "bg-destructive/10 border-destructive text-destructive"
                              : "bg-background border-border text-muted-foreground"
                          )}
                        >
                          {idx < application.current_stage_index ? (
                            "✓"
                          ) : idx === application.current_stage_index ? (
                            "✗"
                          ) : (
                            "○"
                          )}
                        </div>
                        <p className={cn(
                          "mt-2 text-xs text-center max-w-[80px] break-words leading-tight",
                          idx === application.current_stage_index ? "font-bold text-destructive" : "text-muted-foreground"
                        )}>
                          {stage.title}
                        </p>
                      </div>
                      {idx < application.stages.length - 1 && (
                        <div className={cn(
                          "h-0.5 w-6 mx-1 flex-shrink-0",
                          idx < application.current_stage_index ? "bg-muted-foreground/30" : "bg-border"
                        )} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejection Stage Info */}
              {rejectedStage && (
                <Card className="border-destructive/20 bg-destructive/5">
                  <CardContent className="py-3">
                    <p className="text-sm">
                      <span className="font-medium">Rejected at stage:</span>{" "}
                      <span className="text-muted-foreground">{rejectedStage.title}</span>
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Encouragement Message */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-3">
                  <p className="text-xs text-muted-foreground italic">
                    💡 Keep improving! Every application teaches you something valuable. 
                    Your talent strategist is here to help you prepare better for the next opportunity.
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
