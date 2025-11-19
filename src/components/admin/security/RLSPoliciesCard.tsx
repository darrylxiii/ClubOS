import { Shield, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSecurityMetrics } from "@/hooks/useSecurityMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export const RLSPoliciesCard = () => {
  const { rlsMetrics, isLoading } = useSecurityMetrics();

  if (isLoading || !rlsMetrics) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-24 mb-4" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { totalPolicies, tablesWithRLS, totalTables, coveragePercentage, topTables } = rlsMetrics;
  const isHealthy = coveragePercentage >= 90;

  return (
    <Card className={isHealthy ? "border-green-500/20" : "border-orange-500/20"}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">RLS Policies</CardTitle>
          <CardDescription>Row-level security coverage</CardDescription>
        </div>
        <Shield className={`h-4 w-4 ${isHealthy ? 'text-green-500' : 'text-orange-500'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{totalPolicies}</div>
        <p className="text-xs text-muted-foreground mb-4">
          {tablesWithRLS} of {totalTables} tables secured
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Coverage</span>
            <Badge variant={isHealthy ? "default" : "secondary"}>
              {coveragePercentage}%
            </Badge>
          </div>
          <Progress value={coveragePercentage} className="h-2" />
        </div>

        {topTables && topTables.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <TrendingUp className="h-3 w-3" />
              <span>Top Secured Tables</span>
            </div>
            <div className="space-y-1">
              {topTables.slice(0, 3).map((table) => (
                <div key={table.tablename} className="flex justify-between text-xs">
                  <span className="truncate">{table.tablename}</span>
                  <span className="text-muted-foreground">{table.policy_count} policies</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
