import { AlertTriangle, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSecurityMetrics } from "@/hooks/useSecurityMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export const AuthFailuresCard = () => {
  const { authMetrics, isLoading } = useSecurityMetrics();

  if (isLoading || !authMetrics) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-24" />
        </CardContent>
      </Card>
    );
  }

  const { totalFailures, uniqueIPs, topIPs } = authMetrics;
  const isHighRisk = totalFailures > 50;

  return (
    <Card className={isHighRisk ? "border-red-500/20" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
          <CardDescription>Last 24 hours</CardDescription>
        </div>
        <AlertTriangle className={`h-4 w-4 ${isHighRisk ? 'text-red-500' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{totalFailures}</div>
        <p className="text-xs text-muted-foreground mb-4">
          from {uniqueIPs} unique IP{uniqueIPs !== 1 ? 's' : ''}
        </p>

        {isHighRisk && (
          <Badge variant="destructive" className="mb-4">
            High failure rate
          </Badge>
        )}

        {topIPs && topIPs.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Users className="h-3 w-3" />
              <span>Top Failed IPs</span>
            </div>
            <div className="space-y-1">
              {topIPs.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="font-mono truncate">{item.ip}</span>
                  <span className="text-muted-foreground">{item.failure_count} attempts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
