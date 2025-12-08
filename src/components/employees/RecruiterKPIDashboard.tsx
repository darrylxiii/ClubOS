import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useRecruiterMetrics } from "@/hooks/useRecruiterMetrics";
import { 
  Users, 
  TrendingUp, 
  Target, 
  DollarSign,
  UserCheck,
  Clock,
  Calendar,
  Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RecruiterKPIDashboardProps {
  userId: string;
  days?: number;
}

export const RecruiterKPIDashboard = ({ userId, days = 30 }: RecruiterKPIDashboardProps) => {
  const { aggregateStats, pipelineStats, isLoading } = useRecruiterMetrics(userId, days);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = aggregateStats || {
    total_candidates_added: 0,
    total_candidates_placed: 0,
    total_interviews_scheduled: 0,
    total_offers_made: 0,
    total_sourcing_hours: 0,
    total_placement_revenue: 0,
    placement_rate: 0,
    avg_time_to_hire_days: 0,
  };

  const pipeline = pipelineStats || {
    total_sourced: 0,
    in_screening: 0,
    in_interview: 0,
    in_offer: 0,
    hired: 0,
    rejected: 0,
    active_in_pipeline: 0,
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Candidates Sourced</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_candidates_added}</div>
            <p className="text-xs text-muted-foreground">Last {days} days</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Placements</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.total_candidates_placed}</div>
            <p className="text-xs text-muted-foreground">{stats.placement_rate}% conversion</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_interviews_scheduled}</div>
            <p className="text-xs text-muted-foreground">Candidates in interviews</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.total_placement_revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From placements</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recruitment Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <FunnelStep 
              label="Sourced" 
              value={pipeline.total_sourced} 
              total={pipeline.total_sourced} 
              color="bg-primary"
            />
            <FunnelStep 
              label="Screening" 
              value={pipeline.in_screening} 
              total={pipeline.total_sourced} 
              color="bg-blue-500"
            />
            <FunnelStep 
              label="Interview" 
              value={pipeline.in_interview} 
              total={pipeline.total_sourced} 
              color="bg-purple-500"
            />
            <FunnelStep 
              label="Offer" 
              value={pipeline.in_offer} 
              total={pipeline.total_sourced} 
              color="bg-amber-500"
            />
            <FunnelStep 
              label="Hired" 
              value={pipeline.hired} 
              total={pipeline.total_sourced} 
              color="bg-green-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Offers Made</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_offers_made}</div>
            <p className="text-xs text-muted-foreground">
              {pipeline.total_sourced > 0 
                ? `${((stats.total_offers_made / pipeline.total_sourced) * 100).toFixed(0)}% offer rate`
                : 'No candidates sourced'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Time to Hire</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_time_to_hire_days} days</div>
            <p className="text-xs text-muted-foreground">Average per placement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sourcing Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_sourcing_hours}h</div>
            <p className="text-xs text-muted-foreground">Tracked this period</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface FunnelStepProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

const FunnelStep = ({ label, value, total, color }: FunnelStepProps) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{value}</span>
          <Badge variant="outline" className="text-xs">
            {percentage.toFixed(0)}%
          </Badge>
        </div>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};
