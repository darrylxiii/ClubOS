import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Euro, Award, Briefcase } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { InviteSystem } from "@/components/InviteSystem";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Utility function to calculate referral bonus based on salary
const calculateReferralBonus = (salary: number): number => {
  if (salary < 50000) return 1000;
  if (salary < 75000) return 1500;
  if (salary < 125000) return 2000;
  return 3000;
};

const Referrals = () => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('invite_codes')
        .select(`
          *,
          referral_metadata (*),
          referral_network (
            user_id,
            joined_at
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReferralData(data);
      }
      setLoading(false);
    };

    fetchReferrals();
  }, [user]);

  // Mock data for referrals (keeping for now as fallback)
  const referrals = [
    {
      id: 1,
      friendName: "Sarah Mitchell",
      jobTitle: "Chief Technology Officer",
      company: "Stealth Startup",
      salary: 145000,
      status: "interview" as const,
      matchScore: 94,
      referredDate: "2 weeks ago",
      currentStage: "Technical Interview",
    },
    {
      id: 2,
      friendName: "James Rodriguez",
      jobTitle: "VP of Product",
      company: "Elite Tech Fund",
      salary: 85000,
      status: "screening" as const,
      matchScore: 88,
      referredDate: "1 week ago",
      currentStage: "Initial Screening",
    },
    {
      id: 3,
      friendName: "Emma Chen",
      jobTitle: "Head of Design",
      company: "Luxury Tech Brand",
      salary: 65000,
      status: "offer" as const,
      matchScore: 96,
      referredDate: "3 weeks ago",
      currentStage: "Offer Extended",
    },
    {
      id: 4,
      friendName: "Marcus Thompson",
      jobTitle: "Chief Revenue Officer",
      company: "SaaS Unicorn",
      salary: 42000,
      status: "applied" as const,
      matchScore: 82,
      referredDate: "4 days ago",
      currentStage: "Application Submitted",
    },
  ];

  const totalPotentialEarnings = referrals.reduce((sum, ref) => {
    return sum + calculateReferralBonus(ref.salary);
  }, 0);

  const successfulReferrals = referrals.filter(r => r.status === "offer").length;

  const stats = [
    {
      title: "Total Referrals",
      value: referrals.length.toString(),
      icon: Users,
      description: "Friends you've referred",
    },
    {
      title: "Potential Earnings",
      value: `€${totalPotentialEarnings.toLocaleString()}`,
      icon: Euro,
      description: "If all referrals succeed",
    },
    {
      title: "Success Rate",
      value: `${Math.round((successfulReferrals / referrals.length) * 100)}%`,
      icon: Award,
      description: `${successfulReferrals} offers extended`,
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <p className="text-caps text-muted-foreground">Build Your Network</p>
          <h1 className="text-hero">
            Invite & Earn
            <br />
            <span className="italic">Rewards</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Curate our elite community and earn competitive bonuses when your referrals succeed
          </p>
        </div>

        {/* Tabs for Invite System and Referral Tracking */}
        <Tabs defaultValue="invites" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="invites">Invite Codes</TabsTrigger>
            <TabsTrigger value="tracking">Referral Tracking</TabsTrigger>
          </TabsList>

          {/* Invite System Tab */}
          <TabsContent value="invites" className="space-y-6">
            <InviteSystem />
          </TabsContent>

          {/* Referral Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6">{/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border border-accent/20 bg-gradient-card shadow-glow hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.title}
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1 bg-gradient-accent bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Compensation Bands Info */}
        <Card className="border border-accent/20 bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-accent" />
              Referral Bonus Structure
            </CardTitle>
            <CardDescription>Earn competitive bonuses based on role compensation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">€0 - €50k</div>
                <div className="text-2xl font-bold text-accent">€1,000</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">€50k - €75k</div>
                <div className="text-2xl font-bold text-accent">€1,500</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">€75k - €125k</div>
                <div className="text-2xl font-bold text-accent">€2,000</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="text-sm text-muted-foreground mb-1">€125k+</div>
                <div className="text-2xl font-bold text-accent">€3,000</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Your Referrals</h2>
          
          {loading ? (
            <Card className="border border-accent/20 bg-gradient-card">
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading referrals...
              </CardContent>
            </Card>
          ) : referralData.length === 0 ? (
            <Card className="border border-accent/20 bg-gradient-card">
              <CardContent className="py-8 text-center text-muted-foreground">
                No referrals yet. Start by inviting friends using the Invite Codes tab!
              </CardContent>
            </Card>
          ) : (
            referralData.map((invite) => {
              const metadata = invite.referral_metadata?.[0];
              const hasJoined = invite.referral_network?.length > 0;
              
              return (
                <Card key={invite.id} className="border border-accent/20 bg-gradient-card hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">
                            {metadata?.friend_name || 'Pending Signup'}
                          </CardTitle>
                          {hasJoined ? (
                            <StatusBadge status="applied" />
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                        {metadata && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Briefcase className="w-4 h-4" />
                              {metadata.job_title} at {metadata.company_name}
                            </div>
                            {metadata.friend_current_role && (
                              <div className="text-sm text-muted-foreground">
                                Currently: {metadata.friend_current_role}
                                {metadata.friend_current_company && ` at ${metadata.friend_current_company}`}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">Invite Code</div>
                        <Badge variant="outline" className="font-mono">
                          {invite.code}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {metadata?.why_good_fit && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Why good fit?</div>
                        <div className="text-sm">{metadata.why_good_fit}</div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Status</div>
                        <div className="text-sm font-medium">
                          {hasJoined ? 'Signed Up' : invite.used_by ? 'Code Used' : 'Invite Sent'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Sent</div>
                        <div className="text-sm font-medium">
                          {new Date(invite.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Expires</div>
                        <div className="text-sm font-medium">
                          {new Date(invite.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </TabsContent>
    </Tabs>
      </div>
    </AppLayout>
  );
};

export default Referrals;
