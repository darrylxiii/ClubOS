import { Ban, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSecurityMetrics } from "@/hooks/useSecurityMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export const RateLimitingCard = () => {
  const { rateLimitMetrics, isLoading } = useSecurityMetrics();

  if (isLoading || !rateLimitMetrics) {
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

  const { totalRejections, byEndpoint, topIPs } = rateLimitMetrics;
  const isUnderAttack = totalRejections > 100;
  const topEndpoints = Object.entries(byEndpoint)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Card className={isUnderAttack ? "border-orange-500/20" : "border-green-500/20"}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
          <CardDescription>Blocked requests today</CardDescription>
        </div>
        <Ban className={`h-4 w-4 ${isUnderAttack ? 'text-orange-500' : 'text-green-500'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{totalRejections}</div>
        <div className="mt-2">
          <Badge variant={isUnderAttack ? "destructive" : "secondary"}>
            {isUnderAttack ? 'Under Attack' : 'Protected'}
          </Badge>
        </div>

        {topEndpoints.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Activity className="h-3 w-3" />
              <span>Top Limited Endpoints</span>
            </div>
            <div className="space-y-1">
              {topEndpoints.map(([endpoint, count]) => (
                <div key={endpoint} className="flex justify-between text-xs">
                  <span className="truncate">{endpoint}</span>
                  <span className="text-muted-foreground">{count} hits</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {topIPs.length > 0 && topIPs.length <= 3 && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-muted-foreground mb-1">Top IPs</div>
            <div className="space-y-1">
              {topIPs.slice(0, 2).map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="font-mono truncate">{item.ip}</span>
                  <span className="text-muted-foreground">{item.hit_count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
