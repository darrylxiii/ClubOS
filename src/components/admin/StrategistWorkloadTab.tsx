import { useStrategistWorkload } from "@/hooks/useStrategistWorkload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Briefcase, Loader2, AlertTriangle, CheckCircle } from "lucide-react";

export function StrategistWorkloadTab() {
  const { data: workloads, isLoading, error } = useStrategistWorkload();
  
  // Note: workloads now use 'id' (profiles.id) instead of 'user_id'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load workload data
      </div>
    );
  }

  const getCapacityColor = (percent: number) => {
    if (percent >= 90) return 'text-destructive';
    if (percent >= 70) return 'text-warning';
    return 'text-success';
  };

  const getCapacityBadge = (percent: number) => {
    if (percent >= 90) return { label: 'At Capacity', variant: 'destructive' as const, icon: AlertTriangle };
    if (percent >= 70) return { label: 'High Load', variant: 'secondary' as const, icon: AlertTriangle };
    return { label: 'Available', variant: 'outline' as const, icon: CheckCircle };
  };

  const totalCompanies = workloads?.reduce((sum, w) => sum + w.companyCount, 0) || 0;
  const totalCandidates = workloads?.reduce((sum, w) => sum + w.candidateCount, 0) || 0;
  const totalApps = workloads?.reduce((sum, w) => sum + w.activeApplications, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCompanies}</p>
            <p className="text-xs text-muted-foreground">
              across {workloads?.length || 0} strategists
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCandidates}</p>
            <p className="text-xs text-muted-foreground">assigned to strategists</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Active Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalApps}</p>
            <p className="text-xs text-muted-foreground">in pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Strategist List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Strategist Workload</h3>
        
        {workloads?.map((strategist) => {
          const capacityInfo = getCapacityBadge(strategist.capacityPercent);
          const CapacityIcon = capacityInfo.icon;
          
          return (
            <div
              key={strategist.id}
              className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/50"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={strategist.avatar_url || undefined} />
                <AvatarFallback>
                  {strategist.full_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{strategist.full_name}</p>
                  <Badge variant={capacityInfo.variant} className="text-xs">
                    <CapacityIcon className="h-3 w-3 mr-1" />
                    {capacityInfo.label}
                  </Badge>
                </div>
                {strategist.title && (
                  <p className="text-xs text-muted-foreground">{strategist.title}</p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-semibold">{strategist.companyCount}</p>
                  <p className="text-xs text-muted-foreground">Companies</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold">{strategist.candidateCount}</p>
                  <p className="text-xs text-muted-foreground">Candidates</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold">{strategist.activeApplications}</p>
                  <p className="text-xs text-muted-foreground">Active Apps</p>
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="w-32">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className={getCapacityColor(strategist.capacityPercent)}>
                    {strategist.capacityPercent}%
                  </span>
                </div>
                <Progress 
                  value={strategist.capacityPercent} 
                  className="h-2"
                />
              </div>
            </div>
          );
        })}

        {(!workloads || workloads.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            No strategists found
          </div>
        )}
      </div>
    </div>
  );
}
