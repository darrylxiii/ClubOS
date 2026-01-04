import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { migrateToast as toast } from "@/lib/notify";
import { Loader2, Gift, Users, Building2, TrendingUp, Copy, Check, Euro, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ReferralProgram() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralEmail, setReferralEmail] = useState("");

  const { data: referralConfig } = useQuery({
    queryKey: ['referral-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_config')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });

  const { data: myReferrals, isLoading: referralsLoading } = useQuery({
    queryKey: ['my-referrals', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('referral_bonuses')
        .select(`
          *,
          referred:referred_id(email, full_name)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('referral_bonuses')
        .select('status, bonus_amount_euros')
        .eq('referrer_id', user.id);

      if (error) throw error;

      const totalEarned = data
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + r.bonus_amount_euros, 0);

      const pending = data
        .filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + r.bonus_amount_euros, 0);

      const qualified = data
        .filter(r => r.status === 'qualified')
        .reduce((sum, r) => sum + r.bonus_amount_euros, 0);

      return {
        totalEarned,
        pending,
        qualified,
        totalReferrals: data.length,
      };
    },
    enabled: !!user,
  });

  const referralLink = user ? `${window.location.origin}/auth?ref=${user.id}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Your referral link has been copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'qualified':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'pending':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
          <p className="text-muted-foreground">
            Earn up to €10,000 by referring companies and candidates to The Quantum Club
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                <Euro className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">€{stats?.totalEarned.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">€{stats?.pending.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Under review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Qualified</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">€{stats?.qualified.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready for payout</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalReferrals || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Referral Link Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>Share this link with companies and candidates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="font-mono text-sm" />
                <Button onClick={handleCopyLink} variant="outline" className="shrink-0">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">How it works:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Share your unique referral link</li>
                  <li>They sign up and become active users</li>
                  <li>You earn rewards when they qualify</li>
                  <li>Get paid when requirements are met</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Bonus Structure */}
          <Card>
            <CardHeader>
              <CardTitle>Bonus Structure</CardTitle>
              <CardDescription>Earn based on referral type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {referralConfig?.map((config) => (
                <div key={config.id} className="flex items-start justify-between gap-2 pb-3 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {config.config_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    €{config.bonus_amount_euros.toLocaleString()}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>Track the status of all your referrals</CardDescription>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : myReferrals && myReferrals.length > 0 ? (
              <div className="space-y-4">
                {myReferrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        referral.referral_type === 'company' ? 'bg-blue-500/10' : 'bg-green-500/10'
                      }`}>
                        {referral.referral_type === 'company' ? (
                          <Building2 className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Users className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {(referral.referred as any)?.full_name || (referral.referred as any)?.email}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {referral.referral_type} • {formatDistanceToNow(new Date(referral.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold">€{referral.bonus_amount_euros}</p>
                        <Badge className={getStatusColor(referral.status)}>
                          {referral.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No referrals yet</p>
                <p className="text-muted-foreground">
                  Start sharing your referral link to earn rewards
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
