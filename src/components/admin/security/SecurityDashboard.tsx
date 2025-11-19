import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSecurityMetrics } from "@/hooks/useSecurityMetrics";
import { RLSPoliciesCard } from "./RLSPoliciesCard";
import { AuthFailuresCard } from "./AuthFailuresCard";
import { RateLimitingCard } from "./RateLimitingCard";
import { EdgeFunctionsCard } from "./EdgeFunctionsCard";
import { StorageBucketsCard } from "./StorageBucketsCard";
import { SecurityTrendsChart } from "./SecurityTrendsChart";
import { SecurityAlertsPanel } from "./SecurityAlertsPanel";
import { useQueryClient } from "@tanstack/react-query";

export const SecurityDashboard = () => {
  const queryClient = useQueryClient();
  const { isLoading } = useSecurityMetrics();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['security-'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time security monitoring and threat detection
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Active Alerts */}
      <SecurityAlertsPanel />

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <RLSPoliciesCard />
        <AuthFailuresCard />
        <RateLimitingCard />
        <EdgeFunctionsCard />
        <StorageBucketsCard />
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends" className="space-y-4">
          <SecurityTrendsChart />
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            Detailed security metrics and logs coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
