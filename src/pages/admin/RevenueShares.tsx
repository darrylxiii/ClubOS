import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Briefcase, Gift, Settings } from "lucide-react";
import { RevenueDistributionSummary } from "@/components/admin/revenue/RevenueDistributionSummary";
import { RecruiterCommissionsTable } from "@/components/admin/revenue/RecruiterCommissionsTable";
import { ReferralPayoutsTable } from "@/components/admin/revenue/ReferralPayoutsTable";
import { AdminRevenueShareManager } from "@/components/admin/AdminRevenueShareManager";
import { RevenueShareEarningsTable } from "@/components/admin/RevenueShareEarningsTable";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function RevenueSharesPage() {
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
    <div className="space-y-6">
      <RevenueDistributionSummary />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Recruiter Commissions
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Referral Payouts
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <RevenueShareEarningsTable revenueShares={revenueShares} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecruiterCommissionsTable />
            <ReferralPayoutsTable />
          </div>
        </TabsContent>

        <TabsContent value="commissions">
          <RecruiterCommissionsTable />
        </TabsContent>

        <TabsContent value="referrals">
          <ReferralPayoutsTable />
        </TabsContent>

        <TabsContent value="configuration">
          <AdminRevenueShareManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
