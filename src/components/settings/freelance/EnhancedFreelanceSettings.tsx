import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Rocket, CreditCard, Coins, Video, Briefcase, Settings2, Award } from "lucide-react";
import { toast } from "sonner";

// Sub-components
import { FreelanceAvailabilitySection } from "./FreelanceAvailabilitySection";
import { FreelanceRatesSection } from "./FreelanceRatesSection";
import { FreelancePortfolioSection } from "./FreelancePortfolioSection";
import { FreelanceCertificationsSection } from "./FreelanceCertificationsSection";
import { FreelancePayoutSettings } from "./FreelancePayoutSettings";
import { FreelanceVideoIntro } from "./FreelanceVideoIntro";
import { StripeConnectOnboarding } from "@/components/projects/payments/StripeConnectOnboarding";
import { ConnectsSystem } from "@/components/projects/connects/ConnectsSystem";

export function EnhancedFreelanceSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["profile-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch freelance profile data
  const { data: freelanceProfile, isLoading, refetch } = useQuery({
    queryKey: ["freelance-profile-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelance_profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isOpenToFreelance = profile?.open_to_freelance_work || false;

  // Calculate profile completeness
  const calculateCompleteness = () => {
    if (!freelanceProfile) return 0;
    let score = 0;
    const checks = [
      freelanceProfile.professional_title,
      freelanceProfile.professional_summary,
      freelanceProfile.hourly_rate_min,
      freelanceProfile.categories?.length > 0,
      freelanceProfile.portfolio_items && (freelanceProfile.portfolio_items as any[])?.length > 0,
      freelanceProfile.video_intro_url,
      freelanceProfile.stripe_connect_onboarded,
      freelanceProfile.certifications && (freelanceProfile.certifications as any[])?.length > 0,
      freelanceProfile.availability_hours_per_week,
    ];
    checks.forEach(check => { if (check) score += 1; });
    return Math.round((score / checks.length) * 100);
  };

  const profileCompleteness = calculateCompleteness();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOpenToFreelance) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Rocket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Enable Freelance Mode</h3>
          <p className="text-muted-foreground mb-4">
            Turn on "Open to Freelance Projects" in the basic settings above to access enhanced freelance features.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Completeness Overview */}
      <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Freelance Profile
              </CardTitle>
              <CardDescription>
                Complete your profile to attract more clients
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{profileCompleteness}%</div>
              <p className="text-xs text-muted-foreground">Profile Complete</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${freelanceProfile?.stripe_connect_onboarded ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span>Payments {freelanceProfile?.stripe_connect_onboarded ? 'Set Up' : 'Pending'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${freelanceProfile?.video_intro_url ? 'bg-green-500' : 'bg-muted-foreground'}`} />
              <span>Video Intro</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${(freelanceProfile?.portfolio_items as any[])?.length > 0 ? 'bg-green-500' : 'bg-muted-foreground'}`} />
              <span>Portfolio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${freelanceProfile?.is_verified ? 'bg-green-500' : 'bg-muted-foreground'}`} />
              <span>Verified</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="gap-1">
            <Settings2 className="h-4 w-4 hidden sm:inline" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1">
            <CreditCard className="h-4 w-4 hidden sm:inline" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="connects" className="gap-1">
            <Coins className="h-4 w-4 hidden sm:inline" />
            Connects
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-1">
            <Briefcase className="h-4 w-4 hidden sm:inline" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-1">
            <Video className="h-4 w-4 hidden sm:inline" />
            Video
          </TabsTrigger>
          <TabsTrigger value="certifications" className="gap-1">
            <Award className="h-4 w-4 hidden sm:inline" />
            Certs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <FreelanceAvailabilitySection 
            userId={user?.id || ''} 
            freelanceProfile={freelanceProfile}
            onUpdate={() => refetch()}
          />
          <FreelanceRatesSection 
            userId={user?.id || ''} 
            freelanceProfile={freelanceProfile}
            onUpdate={() => refetch()}
          />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <StripeConnectOnboarding />
          <FreelancePayoutSettings 
            userId={user?.id || ''} 
            freelanceProfile={freelanceProfile}
            onUpdate={() => refetch()}
          />
        </TabsContent>

        <TabsContent value="connects" className="space-y-4">
          <ConnectsSystem />
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          <FreelancePortfolioSection 
            userId={user?.id || ''} 
            freelanceProfile={freelanceProfile}
            onUpdate={() => refetch()}
          />
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <FreelanceVideoIntro 
            userId={user?.id || ''} 
            freelanceProfile={freelanceProfile}
            onUpdate={() => refetch()}
          />
        </TabsContent>

        <TabsContent value="certifications" className="space-y-4">
          <FreelanceCertificationsSection 
            userId={user?.id || ''} 
            freelanceProfile={freelanceProfile}
            onUpdate={() => refetch()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
