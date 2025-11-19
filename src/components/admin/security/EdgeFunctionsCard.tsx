import { Code, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const EdgeFunctionsCard = () => {
  // Hardcoded values based on current edge functions configuration
  // In a production system, this would be fetched from a metadata table
  const totalFunctions = 225;
  const authenticatedFunctions = 220;
  const publicFunctions = 5;
  const securityScore = Math.round((authenticatedFunctions / totalFunctions) * 100);
  const isLoading = false;

  if (isLoading) {
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

  return (
    <Card className="border-blue-500/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Edge Functions</CardTitle>
          <CardDescription>API endpoint security</CardDescription>
        </div>
        <Code className="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{totalFunctions}</div>
        <p className="text-xs text-muted-foreground mb-4">
          {authenticatedFunctions} authenticated, {publicFunctions} public
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Security Score</span>
            <Badge variant="default" className="bg-blue-500">
              {securityScore}%
            </Badge>
          </div>
          <Progress value={securityScore} className="h-2" />
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-xs mb-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span className="text-muted-foreground">Public endpoints with rate limiting:</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>join-waitlist</span>
              <span className="text-green-500">✓</span>
            </div>
            <div className="flex justify-between">
              <span>promote-waitlist</span>
              <span className="text-green-500">✓</span>
            </div>
            <div className="flex justify-between">
              <span>webhook-dispatcher</span>
              <span className="text-green-500">✓</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
