import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CandidateOnboardingSteps } from "@/components/candidate-onboarding/CandidateOnboardingSteps";
import { NetworkStatusIndicator } from "@/components/partner-funnel/NetworkStatusIndicator";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles } from "lucide-react";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";

export default function CandidateOnboarding() {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadFunnelConfig();
  }, []);

  const loadFunnelConfig = async () => {
    try {
      // Check if candidate onboarding is active
      const { data, error } = await supabase
        .from("funnel_config")
        .select("*")
        .single();

      if (error) {
        // If no config exists or error, default to active
        console.warn('[Onboarding] funnel_config query error, defaulting to active:', error.message);
        setIsActive(true);
        return;
      }

      if (data) {
        setIsActive(data.is_active);
      }
    } catch (err) {
      console.error('[Onboarding] Failed to load funnel config:', err);
      // Default to active on error
      setIsActive(true);
    }
  };

  if (!isActive) {
    return (
      <>
        <Helmet>
          <title>Applications Paused | The Quantum Club</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="min-h-screen bg-background">
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
              <div className="absolute right-4 flex items-center gap-4">
                <Link 
                  to="/auth" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to Login
                </Link>
                <ThemeToggle />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
            <Card className="max-w-2xl w-full p-12 text-center glass-effect">
              <Sparkles className="w-16 h-16 mx-auto mb-6 text-primary" />
              <h1 className="text-4xl font-bold mb-4">Applications Temporarily Paused</h1>
              <p className="text-muted-foreground text-lg">
                We're currently at capacity and not accepting new applications. 
                Please check back soon or join our waitlist.
              </p>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Apply for Elite Membership | The Quantum Club</title>
        <meta 
          name="description" 
          content="Join The Quantum Club - an exclusive community for the top 3% of professionals. Complete your application in 5 minutes." 
        />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Apply for Elite Membership | The Quantum Club" />
        <meta 
          property="og:description" 
          content="Join 2,500+ exceptional professionals in The Quantum Club. Only 3% of applicants are accepted." 
        />
        <meta property="og:image" content="https://thequantumclub.lovable.app/og-onboarding.png" />
        <meta property="og:url" content="https://thequantumclub.lovable.app/onboarding" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Apply for Elite Membership | The Quantum Club" />
        <meta 
          name="twitter:description" 
          content="Join 2,500+ exceptional professionals. Only 3% of applicants are accepted." 
        />
        <link rel="canonical" href="https://thequantumclub.lovable.app/onboarding" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
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
            <div className="absolute right-4 flex items-center gap-4">
              <Link 
                to="/auth" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Login
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="text-center max-w-4xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Only 3% of applicants are accepted</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              Apply for Elite Membership
            </h1>
            <p className="text-xl text-muted-foreground mt-4">
              Join 2,500+ exceptional professionals in The Quantum Club
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              ~5 minutes to complete • Your data is encrypted and secure
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <CandidateOnboardingSteps />
          </div>
        </div>
        
        {/* Network Status Indicator */}
        <NetworkStatusIndicator />
      </div>
    </>
  );
}
