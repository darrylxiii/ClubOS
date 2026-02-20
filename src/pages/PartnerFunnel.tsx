import { useEffect, useState } from "react";
import { FunnelSteps } from "@/components/partner-funnel/FunnelSteps";
import { FunnelAIAssistant } from "@/components/partner-funnel/FunnelAIAssistant";
import { SocialProofCarousel } from "@/components/partner-funnel/SocialProofCarousel";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles } from "lucide-react";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

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
      setLiveStats(data.live_stats as typeof liveStats);
    }
  };

  if (!isActive) {
    return (
      <div className="min-h-screen bg-background">
        {/* Top Banner */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-2 py-1 relative flex justify-center items-center">
            <img 
              src={quantumLogoDark} 
              alt="Quantum Club" 
              className="h-20 w-auto dark:hidden"
            />
            <img 
              src={quantumLogoLight} 
              alt="Quantum Club" 
              className="h-20 w-auto hidden dark:block"
            />
            <div className="absolute right-4">
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
          <Card className="max-w-2xl w-full p-12 text-center glass-effect">
            <Sparkles className="w-16 h-16 mx-auto mb-6 text-primary" />
            <h1 className="text-4xl font-bold mb-4">Partnership Applications Temporarily Paused</h1>
            <p className="text-muted-foreground text-lg">
              We're currently at capacity and not accepting new partnership applications. 
              Please check back soon or join our waitlist.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Banner */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-2 py-1 relative flex justify-center items-center">
          <img 
            src={quantumLogoDark} 
            alt="Quantum Club" 
            className="h-20 w-auto dark:hidden"
          />
          <img 
            src={quantumLogoLight} 
            alt="Quantum Club" 
            className="h-20 w-auto hidden dark:block"
          />
          <div className="absolute right-4">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-3">
            Access pre-vetted senior talent.
          </h1>
          <p className="text-lg text-muted-foreground">
            Tell us who you're looking for — we'll have a shortlist ready within two weeks. No upfront fees, no contracts.
          </p>
        </div>

        {/* How it works — 3 icon strip */}
        <div className="flex items-center justify-center gap-2 sm:gap-6 mb-8 text-sm text-muted-foreground max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">1</span>
            </div>
            <span>Submit request</span>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">2</span>
            </div>
            <span>Strategy call</span>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">3</span>
            </div>
            <span>Receive shortlist</span>
          </div>
        </div>

        {/* Social Proof — above the form */}
        <div className="max-w-2xl mx-auto mb-6">
          <SocialProofCarousel />
        </div>

        {/* Main Funnel */}
        <div className="max-w-2xl mx-auto">
          <FunnelSteps />
        </div>
      </div>

      {/* AI Assistant */}
      <FunnelAIAssistant />
    </div>
  );
}
