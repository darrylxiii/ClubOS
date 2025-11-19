import { Database, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSecurityMetrics } from "@/hooks/useSecurityMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export const StorageBucketsCard = () => {
  const { storageMetrics, isLoading } = useSecurityMetrics();

  if (isLoading || !storageMetrics) {
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

  const { totalBuckets, publicBuckets, privateBuckets, withSizeLimits, withMimeRestrictions } = storageMetrics;
  const publicPercentage = totalBuckets > 0 ? Math.round((publicBuckets / totalBuckets) * 100) : 0;
  const isSecure = publicPercentage < 50;

  return (
    <Card className={isSecure ? "border-green-500/20" : "border-orange-500/20"}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Storage Buckets</CardTitle>
          <CardDescription>File storage security</CardDescription>
        </div>
        <Database className={`h-4 w-4 ${isSecure ? 'text-green-500' : 'text-orange-500'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{totalBuckets}</div>
        <p className="text-xs text-muted-foreground mb-4">
          {publicBuckets} public, {privateBuckets} private
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Public buckets</span>
            <Badge variant={isSecure ? "secondary" : "destructive"}>
              {publicPercentage}%
            </Badge>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Security Controls</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Size limits</span>
              <span className="text-muted-foreground">{withSizeLimits} buckets</span>
            </div>
            <div className="flex justify-between">
              <span>MIME restrictions</span>
              <span className="text-muted-foreground">{withMimeRestrictions} buckets</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
