import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, MapPin, Clock, Users, FileText, ChevronRight, 
  Building2, Calendar, Activity 
} from "lucide-react";
import { InsightsPanel } from "./InsightsPanel";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

interface CompactSidebarProps {
  job: any;
  metrics: {
    totalApplicants: number;
    stageBreakdown: { [key: number]: number };
    avgDaysInStage: { [key: number]: number };
    conversionRates: { [key: string]: number };
  } | null;
  stages: any[];
  activities: any[];
  teamMembers: any[];
}

export const CompactSidebar = memo(({
  job,
  metrics,
  stages,
  activities,
  teamMembers
}: CompactSidebarProps) => {
  const navigate = useNavigate();

  // Format salary
  const formatSalary = (amount: number) => {
    if (amount >= 1000) return `€${(amount / 1000).toFixed(0)}k`;
    return `€${amount}`;
  };
  
  const salaryRange = job?.salary_min && job?.salary_max 
    ? `${formatSalary(job.salary_min)} - ${formatSalary(job.salary_max)}`
    : job?.salary_min 
      ? `From ${formatSalary(job.salary_min)}`
      : 'Not specified';

  return (
    <div className="space-y-4">
      {/* AI Insights */}
      {metrics && <InsightsPanel metrics={metrics} stages={stages} />}

      {/* Job Details */}
      <Card className="border border-border/40 bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 className="w-4 h-4" />
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{job?.location || 'Remote'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="capitalize truncate">{job?.employment_type || 'Full-time'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span>{salaryRange}</span>
            </div>
          </div>
          
          {job?.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 pt-2 border-t border-border/30">
              {job.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Team */}
      {teamMembers.length > 0 && (
        <Card className="border border-border/40 bg-card/95">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="w-4 h-4" />
                Team
              </span>
              <Badge variant="secondary" className="h-5 text-xs bg-muted/50 border-0">
                {teamMembers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 5).map((member, idx) => (
                <Avatar key={idx} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="text-xs bg-muted">
                    {member.name?.[0] || 'T'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {teamMembers.length > 5 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{teamMembers.length - 5}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="border border-border/40 bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="w-4 h-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 text-center py-4">
              No activity yet
            </p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarImage src={activity.profiles?.avatar_url} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {(activity.profiles?.full_name || 'U')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">
                      <span className="font-medium">{activity.profiles?.full_name || 'Someone'}</span>
                      <span className="text-muted-foreground"> {activity.action?.replace(/_/g, ' ')}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="border border-border/40 bg-card/95">
        <CardContent className="p-3 space-y-1">
          <Button 
            variant="ghost" 
            className="w-full justify-between h-9 text-sm font-normal"
            onClick={() => navigate(`/jobs/${job.id}/documents`)}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Documents
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-between h-9 text-sm font-normal"
            onClick={() => {}}
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Interviews
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

CompactSidebar.displayName = 'CompactSidebar';
