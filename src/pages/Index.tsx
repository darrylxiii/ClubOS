import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedInviteGate } from "@/components/landing/EnhancedInviteGate";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { SocialProof } from "@/components/landing/SocialProof";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LiveActivityPulse } from "@/components/LiveActivityPulse";
import { Sparkles } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to club home
  useEffect(() => {
    if (user) {
      navigate("/home");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-glass-mesh">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center font-black text-white shadow-glow">
              QC
            </div>
            <span className="text-xl font-bold tracking-tight">The Quantum Club</span>
          </div>
          <LiveActivityPulse />
        </div>
      </header>

      {/* Hero Section with Mesh Gradient */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-12">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-mesh opacity-40"></div>
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-strong animate-bounce-in">
            <div className="relative">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping"></div>
            </div>
            <span className="text-sm font-bold tracking-wide">Invite Only • Elite Network</span>
          </div>

          {/* Main Heading */}
          <div className="space-y-8 animate-fade-in">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none">
              Your Career
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
                Quantum Leap
              </span>
              <br />
              Starts Here
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
              An invite-only platform for visionary talent. Track elite opportunities,
              prepare for high-stakes interviews, and access undisclosed roles.
            </p>
          </div>

          {/* Invite Gate */}
          <div className="pt-8 animate-scale-in" style={{ animationDelay: "200ms" }}>
            <EnhancedInviteGate />
          </div>

          {/* Value Props */}
          <div className="grid md:grid-cols-3 gap-6 pt-16">
            {[
              { label: "Top 1% Talent", delay: "0ms" },
              { label: "Elite Partners", delay: "100ms" },
              { label: "92% Success", delay: "200ms" },
            ].map((item) => (
              <div
                key={item.label}
                className="group p-8 rounded-2xl glass hover-lift animate-fade-in relative overflow-hidden"
                style={{ animationDelay: item.delay }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative text-lg font-bold">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <FeatureCards />

      {/* Social Proof */}
      <SocialProof />

      {/* CTA Section */}
      <section className="px-6 py-24 md:py-40 text-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-10">
          <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
            Ready to Join
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              The Elite?
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Request your invite today and take the first step toward your career quantum leap.
          </p>
          <div className="animate-bounce-in" style={{ animationDelay: "300ms" }}>
            <EnhancedInviteGate />
          </div>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
};

export default Index;
