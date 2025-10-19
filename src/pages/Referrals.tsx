import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Euro, Plus } from "lucide-react";
import { InviteSystem } from "@/components/InviteSystem";
import { ReferralPipelineTracker } from "@/components/referrals/ReferralPipelineTracker";
import { ReferralStats } from "@/components/referrals/ReferralStats";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const calculateReferralBonus = (salary: number = 75000): number => {
  if (salary < 50000) return 1000;
  if (salary < 75000) return 1500;
  if (salary < 125000) return 2000;
  return 3000;
};

const Referrals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    successfulHires: 0,
    totalEarnings: 0,
    potentialEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchReferralStats = async () => {
      try {
        // Get all referrals with their application data
        const { data: inviteCodes } = await supabase
          .from('invite_codes')
          .select(`
            *,
            referral_metadata (*),
            referral_network (
              user_id,
              joined_at
            )
          `)
          .eq('created_by', user.id);

        let activeCount = 0;
        let hiredCount = 0;
        let totalEarned = 0;
        let totalPotential = 0;

        for (const invite of inviteCodes || []) {
          const metadata = invite.referral_metadata?.[0];
          const networkEntry = invite.referral_network?.[0];

          if (networkEntry?.user_id) {
            const { data: application } = await supabase
              .from('applications')
              .select('status')
              .eq('user_id', networkEntry.user_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const estimatedSalary = 75000; // Default estimate
            const reward = calculateReferralBonus(estimatedSalary);

            if (application) {
              if (application.status === 'hired') {
                hiredCount++;
                totalEarned += reward;
              } else if (application.status === 'active') {
                activeCount++;
                totalPotential += reward;
              }
            }
          } else if (metadata) {
            totalPotential += calculateReferralBonus(75000);
          }
        }

        setStats({
          totalReferrals: inviteCodes?.length || 0,
          activeReferrals: activeCount,
          successfulHires: hiredCount,
          totalEarnings: totalEarned,
          potentialEarnings: totalPotential,
        });
      } catch (error) {
        console.error('Error fetching referral stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReferralStats();
  }, [user]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <p className="text-caps text-muted-foreground">Build Your Network</p>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
            Invite & Earn Rewards
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Curate our elite community and earn competitive bonuses when your referrals succeed
          </p>
        </div>

        {/* Stats Overview */}
        {!loading && (
          <ReferralStats
            totalReferrals={stats.totalReferrals}
            activeReferrals={stats.activeReferrals}
            successfulHires={stats.successfulHires}
            totalEarnings={stats.totalEarnings}
            potentialEarnings={stats.potentialEarnings}
          />
        )}

        {/* Tabs for Pipeline Tracking and Invite System */}
        <Tabs defaultValue="tracking" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="tracking">Live Pipeline</TabsTrigger>
              <TabsTrigger value="invites">Invite Codes</TabsTrigger>
            </TabsList>
            <Button 
              onClick={() => navigate('/jobs')}
              className="gap-2"
              variant="glass"
            >
              <Plus className="w-4 h-4" />
              New Referral
            </Button>
          </div>

          {/* Live Pipeline Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Active Referral Pipelines</h2>
              </div>
              <ReferralPipelineTracker />
            </div>

            {/* Compensation Bands Info */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="w-5 h-5" />
                  Referral Bonus Structure
                </CardTitle>
                <CardDescription>
                  Earn tiered bonuses when your referrals get hired
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <div className="text-sm text-muted-foreground mb-1">€0 - €50k</div>
                    <div className="text-2xl font-bold">€1,000</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <div className="text-sm text-muted-foreground mb-1">€50k - €75k</div>
                    <div className="text-2xl font-bold">€1,500</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <div className="text-sm text-muted-foreground mb-1">€75k - €125k</div>
                    <div className="text-2xl font-bold">€2,000</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                    <div className="text-sm text-muted-foreground mb-1">€125k+</div>
                    <div className="text-2xl font-bold">€3,000</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invite System Tab */}
          <TabsContent value="invites" className="space-y-6">
            <InviteSystem />
          </TabsContent>
    </Tabs>
      </div>
    </AppLayout>
  );
};

export default Referrals;
