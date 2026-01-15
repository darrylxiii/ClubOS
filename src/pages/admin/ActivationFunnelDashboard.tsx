import { useState } from "react";
import { useActivationFunnel, useTimeToMilestone, ACTIVATION_MILESTONES } from "@/hooks/useActivationMetrics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, Clock, Users, TrendingUp, Target, Zap } from "lucide-react";

export default function ActivationFunnelDashboard() {
  const [days, setDays] = useState(30);
  const { data: funnelData, isLoading: funnelLoading } = useActivationFunnel(days);
  const { data: timeMetrics, isLoading: timeLoading } = useTimeToMilestone(days);

  const formatTime = (hours: number | null) => {
    if (!hours) return "N/A";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activation Funnel</h1>
          <p className="text-muted-foreground">Track user progression through key milestones</p>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {funnelLoading ? <Skeleton className="h-8 w-16" /> : funnelData?.[0]?.count || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              First Hire Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              {funnelLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                `${(funnelData?.find(s => s.milestone.toLowerCase().includes('first hire'))?.conversionRate || 0).toFixed(1)}%`
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Time to First Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {timeLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                formatTime(timeMetrics?.find(m => m.milestone === ACTIVATION_MILESTONES.FIRST_MATCH.name)?.avgHours || null)
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Avg Time to First Hire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {timeLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                formatTime(timeMetrics?.find(m => m.milestone === ACTIVATION_MILESTONES.FIRST_HIRE.name)?.avgHours || null)
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Funnel */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>User progression through activation milestones</CardDescription>
        </CardHeader>
        <CardContent>
          {funnelLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {funnelData?.map((step, idx) => (
                <div key={step.milestone}>
                  <div 
                    className="relative bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg p-4 transition-all hover:from-primary/30"
                    style={{ 
                      width: `${Math.max(step.conversionRate, 20)}%`,
                      minWidth: '200px'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {idx + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{step.milestone}</p>
                          <p className="text-xs text-muted-foreground">
                            {step.count} users
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{step.conversionRate.toFixed(1)}%</p>
                        {idx > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {step.dropoffRate.toFixed(1)}% dropoff
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {idx < (funnelData?.length || 0) - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time to Milestone */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time to Milestone
          </CardTitle>
          <CardDescription>Average time users take to reach each milestone</CardDescription>
        </CardHeader>
        <CardContent>
          {timeLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {timeMetrics?.map((metric) => (
                <div key={metric.milestone} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{metric.milestone}</p>
                    <Progress 
                      value={Math.min((metric.avgHours / 168) * 100, 100)} 
                      className="h-2 mt-1"
                    />
                  </div>
                  <div className="ml-4 text-right min-w-[80px]">
                    <p className="font-bold">{formatTime(metric.avgHours)}</p>
                    <p className="text-xs text-muted-foreground">{metric.count} users</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
