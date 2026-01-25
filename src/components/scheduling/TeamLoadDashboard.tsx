import React from 'react';
import { useTeamLoadBalance } from '@/hooks/useFocusTimeDefender';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  RefreshCw,
  Heart,
  Activity,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamLoadDashboardProps {
  bookingLinkId: string;
}

export function TeamLoadDashboard({ bookingLinkId }: TeamLoadDashboardProps) {
  const {
    teamLoad,
    isLoading,
    error,
    refetch,
    getRebalanceSuggestions,
  } = useTeamLoadBalance(bookingLinkId);

  const [suggestions, setSuggestions] = React.useState<any>(null);

  const handleGetSuggestions = async () => {
    const result = await getRebalanceSuggestions.mutateAsync();
    setSuggestions(result);
  };

  const getBurnoutRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-destructive bg-destructive/10';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getLoadColor = (load: number) => {
    if (load >= 80) return 'bg-destructive';
    if (load >= 60) return 'bg-orange-500';
    if (load >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !teamLoad) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
          <p className="text-destructive">Failed to load team data</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { teamMembers, teamMetrics, teamHealthStatus } = teamLoad;

  return (
    <div className="space-y-6">
      {/* Team Health Overview */}
      <Card className={cn(
        "border-l-4",
        teamHealthStatus === 'critical' ? "border-l-destructive" :
        teamHealthStatus === 'concerning' ? "border-l-orange-500" :
        "border-l-green-500"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Team Meeting Load
            </CardTitle>
            <Badge variant={
              teamHealthStatus === 'critical' ? 'destructive' :
              teamHealthStatus === 'concerning' ? 'secondary' :
              'outline'
            }>
              {teamHealthStatus === 'critical' ? 'Critical' :
               teamHealthStatus === 'concerning' ? 'Needs Attention' :
               'Healthy'}
            </Badge>
          </div>
          <CardDescription>
            Real-time meeting distribution across your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{teamMetrics.averageLoad}%</p>
              <p className="text-xs text-muted-foreground">Avg Load</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-green-600">{teamMetrics.healthyMembers}</p>
              <p className="text-xs text-muted-foreground">Healthy</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{teamMetrics.highBurnoutRisk}</p>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-destructive">{teamMetrics.criticalBurnoutRisk}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
          </div>

          {/* Team Member Load Bars */}
          <div className="space-y-4">
            {teamMembers.map((member: any) => (
              <div key={member.userId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.fullName}`} />
                      <AvatarFallback>
                        {member.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.fullName}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", getBurnoutRiskColor(member.burnoutRisk))}>
                      {member.burnoutRisk}
                    </Badge>
                    <span className="text-sm font-medium">{member.todayLoad}%</span>
                  </div>
                </div>
                <Progress 
                  value={member.todayLoad} 
                  className="h-2"
                  // @ts-ignore - custom indicator class
                  indicatorClassName={getLoadColor(member.todayLoad)}
                />
                {member.recommendations?.length > 0 && (
                  <div className="text-xs text-muted-foreground pl-10">
                    <AlertTriangle className="h-3 w-3 inline mr-1 text-orange-500" />
                    {member.recommendations[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rebalancing Suggestions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Smart Rebalancing
              </CardTitle>
              <CardDescription>
                AI-powered suggestions to optimize team workload
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={handleGetSuggestions}
              disabled={getRebalanceSuggestions.isPending}
            >
              {getRebalanceSuggestions.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Get Suggestions
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions?.suggestions?.length > 0 ? (
            <div className="space-y-3">
              {suggestions.suggestions.map((suggestion: any, i: number) => (
                <div 
                  key={i}
                  className={cn(
                    "p-3 rounded-lg border flex items-start gap-3",
                    suggestion.priority === 'high' ? "border-destructive/50 bg-destructive/5" :
                    "border-muted"
                  )}
                >
                  {suggestion.type === 'redistribute' ? (
                    <TrendingDown className="h-5 w-5 text-blue-500 mt-0.5" />
                  ) : (
                    <Heart className="h-5 w-5 text-green-500 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {suggestion.type === 'redistribute' ? 'Redistribute Meetings' : 'Add Focus Time'}
                    </p>
                    <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                  </div>
                  {suggestion.priority === 'high' && (
                    <Badge variant="destructive" className="ml-auto">High Priority</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Click "Get Suggestions" to analyze team workload</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamLoadDashboard;
