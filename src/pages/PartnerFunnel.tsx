import { useEffect, useState } from "react";
import { FunnelSteps } from "@/components/partner-funnel/FunnelSteps";
import { FunnelAIAssistant } from "@/components/partner-funnel/FunnelAIAssistant";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles } from "lucide-react";
import quantumLogoLight from "@/assets/quantum-logo-light-transparent.png";
import quantumLogoDark from "@/assets/quantum-logo-dark-transparent.png";

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
      <div className="min-h-screen bg-background">
        {/* Top Banner */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-2 py-1 relative flex justify-center items-center">
            <img 
              src={quantumLogoDark} 
              alt="Quantum Club" 
              className="h-28 dark:hidden"
            />
            <img 
              src={quantumLogoLight} 
              alt="Quantum Club" 
              className="h-28 hidden dark:block"
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
            className="h-28 dark:hidden"
          />
          <img 
            src={quantumLogoLight} 
            alt="Quantum Club" 
            className="h-28 hidden dark:block"
          />
          <div className="absolute right-4">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="text-center max-w-4xl mx-auto mb-8">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            Partner Request
          </h1>
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
