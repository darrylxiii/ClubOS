import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { InviteGate } from "@/components/landing/InviteGate";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { SocialProof } from "@/components/landing/SocialProof";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LivePulse } from "@/components/LivePulse";
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
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-foreground/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-lg font-black uppercase tracking-tight">The Quantum Club</span>
          </div>
          <div className="flex items-center gap-4">
            <LivePulse />
          </div>
        </div>
      </header>

      {/* Hero Section with Cosmic Background */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-12">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_hsl(var(--foreground)/0.03)_0%,_transparent_50%)] animate-pulse"></div>
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-foreground/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-foreground/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-foreground/10 bg-background/50 backdrop-blur-sm">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-wider">Invite Only • Elite Members</span>
          </div>

          {/* Main Heading */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-none">
              YOUR CAREER
              <br />
              <span className="italic bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                QUANTUM LEAP
              </span>
              <br />
              STARTS HERE
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              An invite-only operating system for visionary talent. Track elite opportunities,
              prepare for high-stakes interviews, and access undisclosed roles.
            </p>
          </div>

          {/* Invite Gate */}
          <div className="pt-8">
            <InviteGate />
          </div>

          {/* Value Props */}
          <div className="grid md:grid-cols-3 gap-6 pt-12">
            {["Top 1% Talent", "Elite Partners", "92% Success Rate"].map((text, index) => (
              <div
                key={text}
                className="p-6 rounded-lg border-2 border-foreground/10 bg-card/50 backdrop-blur-sm animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-sm font-black uppercase tracking-wider">{text}</div>
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
      <section className="px-6 py-20 md:py-32 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight">
            READY TO JOIN
            <br />
            THE ELITE?
          </h2>
          <p className="text-lg text-muted-foreground">
            Request your invite today and take the first step toward your career quantum leap.
          </p>
          <InviteGate />
        </div>
      </section>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
};

export default Index;
