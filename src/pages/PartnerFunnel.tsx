import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { RECAPTCHA_SITE_KEY } from "@/config/recaptcha";
import { FunnelSteps } from "@/components/partner-funnel/FunnelSteps";
import { FunnelAIAssistant } from "@/components/partner-funnel/FunnelAIAssistant";
import { SocialProofCarousel } from "@/components/partner-funnel/SocialProofCarousel";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
        <Helmet>
          <title>Partnership Applications Paused — The Quantum Club</title>
        </Helmet>
        {/* Top Banner */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-2 py-1 flex justify-center items-center">
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
          </div>
        </div>

        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
          <Card className="max-w-2xl w-full p-12 text-center glass">
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

  const content = (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Partner with The Quantum Club — Access Pre-Vetted Senior Talent</title>
        <meta name="description" content="Access pre-vetted senior talent. Tell us who you're looking for — we'll have a shortlist ready within two weeks. No upfront fees, no contracts." />
        <meta property="og:title" content="Partner with The Quantum Club — Access Pre-Vetted Senior Talent" />
        <meta property="og:description" content="Submit your hiring request and receive a curated shortlist of senior candidates within 14 days. No upfront fees, no contracts." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://os.thequantumclub.com/partner" />
        <meta property="og:image" content="https://os.thequantumclub.com/og-image.gif" />
        <meta property="og:image:width" content="432" />
        <meta property="og:image:height" content="540" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@thequantumclub" />
        <meta name="twitter:title" content="Partner with The Quantum Club — Access Pre-Vetted Senior Talent" />
        <meta name="twitter:description" content="Submit your hiring request and receive a curated shortlist of senior candidates within 14 days." />
        <meta name="twitter:image" content="https://os.thequantumclub.com/og-image-twitter-v3.gif" />
        <link rel="canonical" href="https://os.thequantumclub.com/partner" />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "The Quantum Club",
          "url": "https://thequantumclub.com",
          "logo": "https://os.thequantumclub.com/quantum-clover-icon.png",
          "description": "Luxury executive recruitment platform specialising in senior and C-suite placements across Technology, Finance, Healthcare, and Consulting.",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Pieter Cornelisz. Hooftstraat 41-2",
            "addressLocality": "Amsterdam",
            "addressCountry": "NL"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "sales",
            "url": "https://os.thequantumclub.com/partner"
          },
          "sameAs": [
            "https://www.linkedin.com/company/thequantumclub"
          ]
        })}</script>
      </Helmet>

      {/* Top Banner */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-2 py-1 flex justify-center items-center">
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
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-6 pb-4">
        <div className="text-center max-w-2xl mx-auto mb-3">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-3">
            0.1% of the market in hours, not days or weeks.
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            Describe the role. We handle the rest.
          </p>
          <p className="text-sm text-muted-foreground">
            No fees until you hire. No long-term contracts.
          </p>
        </div>

        {/* How it works — compact single-line on desktop */}
        <div className="hidden sm:flex items-center justify-center gap-2 sm:gap-6 mb-4 text-sm text-muted-foreground max-w-lg mx-auto">
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-6 h-6 rounded-full bg-card/40 border border-border/30 flex items-center justify-center">
              <span className="text-muted-foreground text-xs">1</span>
            </div>
            <span>Share your brief</span>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-6 h-6 rounded-full bg-card/40 border border-border/30 flex items-center justify-center">
              <span className="text-muted-foreground text-xs">2</span>
            </div>
            <span>Speak with a strategist</span>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="w-6 h-6 rounded-full bg-card/40 border border-border/30 flex items-center justify-center">
              <span className="text-muted-foreground text-xs">3</span>
            </div>
            <span>Review your shortlist</span>
          </div>
        </div>

        {/* Mobile: compact badge instead of full strip */}
        <div className="sm:hidden flex justify-center mb-4">
          <span className="text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-full px-4 py-1.5">
            Three steps. Under two minutes.
          </span>
        </div>

        {/* Main Funnel — ABOVE social proof for above-the-fold visibility */}
        <div className="max-w-2xl mx-auto">
          <FunnelSteps />
        </div>

        {/* Social Proof — below the form */}
        <div className="max-w-2xl mx-auto mt-6">
          <SocialProofCarousel />
        </div>
      </div>

      {/* AI Assistant */}
      <FunnelAIAssistant />
    </div>
  );

  if (RECAPTCHA_SITE_KEY) {
    return (
      <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
        {content}
      </GoogleReCaptchaProvider>
    );
  }

  return content;
}
