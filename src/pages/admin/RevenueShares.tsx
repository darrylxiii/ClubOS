import { RoleGate } from "@/components/RoleGate";
import { AdminRevenueShareManager } from "@/components/admin/AdminRevenueShareManager";
import { RevenueShareSummary } from "@/components/admin/RevenueShareSummary";
import { RevenueShareEarningsTable } from "@/components/admin/RevenueShareEarningsTable";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Calculator } from "lucide-react";

export default function RevenueSharesPage() {
  // Fetch revenue shares for summary and earnings components
  const { data: revenueShares = [] } = useQuery({
    queryKey: ['revenue-shares-page'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_revenue_shares')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        return data.map(share => ({
          ...share,
          user_profile: profileMap.get(share.user_id) || null
        }));
      }
      
      return data || [];
    }
  });

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <h1 className="text-3xl font-bold mb-2">Revenue Shares</h1>
          <p className="text-muted-foreground mb-6">
            Configure commission percentages and track earnings from Moneybird invoices
          </p>

          {/* Summary cards with Moneybird data */}
          <RevenueShareSummary revenueShares={revenueShares} />

          <Tabs defaultValue="earnings" className="space-y-4">
            <TabsList>
              <TabsTrigger value="earnings" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Earnings
              </TabsTrigger>
              <TabsTrigger value="configuration" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="earnings">
              <RevenueShareEarningsTable revenueShares={revenueShares} />
            </TabsContent>

            <TabsContent value="configuration">
              <AdminRevenueShareManager />
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
