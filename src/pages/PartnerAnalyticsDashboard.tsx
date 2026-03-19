import { PartnerAnalytics } from "@/components/partner/PartnerAnalytics";
import { EnhancedAnalytics } from "@/components/partner/EnhancedAnalytics";
import { CompanyAnalyticsChart } from "@/components/partner/CompanyAnalyticsChart";
import { BenchmarkComparison } from "@/components/partner/BenchmarkComparison";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useGenerateInsights } from "@/hooks/usePartnerAnalytics";
import { toast } from "sonner";
import { PageLoader } from "@/components/PageLoader";
import { InlineLoader } from "@/components/ui/unified-loader";

export default function PartnerAnalyticsDashboard() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generateInsights = useGenerateInsights(companyId || undefined);

  useEffect(() => {
    async function fetchCompany() {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      setCompanyId(profile?.company_id || null);
      setLoading(false);
    }
    fetchCompany();
  }, [user]);

  const handleRefresh = async () => {
    if (!companyId) return;
    try {
      await generateInsights.mutateAsync(undefined);
      await (supabase as any).rpc('generate_daily_analytics_snapshot', {
        p_company_id: companyId
      });
      toast.success('Analytics refreshed');
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    }
  };

  if (loading) return <PageLoader />;

  if (!companyId) {
    return (
      <div className="py-8">
        <p className="text-muted-foreground">No company associated with your account</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={generateInsights.isPending}
          className="gap-2 border-border/30"
        >
          {generateInsights.isPending ? (
            <InlineLoader text="Refreshing..." />
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Refresh Insights
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-card/30 backdrop-blur-sm border border-border/20">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <CompanyAnalyticsChart companyId={companyId} />
          <PartnerAnalytics companyId={companyId} />
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          <PartnerAnalytics companyId={companyId} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <EnhancedAnalytics />
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6">
          <BenchmarkComparison companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
