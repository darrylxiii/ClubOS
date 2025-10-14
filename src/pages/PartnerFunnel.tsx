import { useEffect, useState } from "react";
import { FunnelSteps } from "@/components/partner-funnel/FunnelSteps";
import { SocialProofCarousel } from "@/components/partner-funnel/SocialProofCarousel";
import { FunnelAIAssistant } from "@/components/partner-funnel/FunnelAIAssistant";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Clock } from "lucide-react";

export default function PartnerFunnel() {
  const [isActive, setIsActive] = useState(true);
  const [liveStats, setLiveStats] = useState({
    partnerships_this_month: 0,
    avg_response_hours: 0,
    active_roles: 0,
  });

  useEffect(() => {
    loadFunnelConfig();
  }, []);

  const loadFunnelConfig = async () => {
    const { data } = await supabase
      .from("funnel_config")
      .select("*")
      .single();

    if (data) {
      setIsActive(data.is_active);
      setLiveStats(data.live_stats as any);
    }
  };

  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-12 text-center glass-effect">
          <Sparkles className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h1 className="text-4xl font-bold mb-4">Partnership Applications Temporarily Paused</h1>
          <p className="text-muted-foreground text-lg">
            We're currently at capacity and not accepting new partnership applications. 
            Please check back soon or join our waitlist.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <Badge className="mb-4 glass-effect" variant="outline">
            <Sparkles className="w-3 h-3 mr-1" />
            Elite Partnership Program
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Partner with The Quantum Club
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Join the most exclusive talent network. No-cure-no-pay model. 
            Premium candidates. Executive-level service.
          </p>

          {/* Live Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <Card className="p-6 glass-effect hover-scale">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">{liveStats.partnerships_this_month}</div>
              <div className="text-sm text-muted-foreground">Partnerships This Month</div>
            </Card>
            <Card className="p-6 glass-effect hover-scale">
              <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">{liveStats.avg_response_hours}h</div>
              <div className="text-sm text-muted-foreground">Average Response Time</div>
            </Card>
            <Card className="p-6 glass-effect hover-scale">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">{liveStats.active_roles}</div>
              <div className="text-sm text-muted-foreground">Active Roles</div>
            </Card>
          </div>

          {/* Social Proof */}
          <SocialProofCarousel />
        </div>

        {/* Main Funnel */}
        <div className="max-w-4xl mx-auto">
          <FunnelSteps />
        </div>
      </div>

      {/* AI Assistant */}
      <FunnelAIAssistant />
    </div>
  );
}
