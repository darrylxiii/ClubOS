import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CheckCircle } from "lucide-react";
import { PartnerRequestTracker } from "@/components/partner-funnel/PartnerRequestTracker";
import quantumLogoLight from "@/assets/quantum-logo-dark.png";
import quantumLogoDark from "@/assets/quantum-club-logo.png";
import { useEffect } from "react";

// Extend Window interface for Google Tag Manager
declare global {
  interface Window {
    dataLayer?: any[];
  }
}

export default function PartnershipSubmitted() {
  const { companyName } = useParams<{ companyName?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Track page view for Google Tag Manager
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'partnership_submitted',
        companyName: companyName,
      });
    }
  }, [companyName]);

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

      {/* Success Content */}
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto p-8 md:p-12">
          <div className="py-8">
            <div className="text-center mb-8">
              <CheckCircle className="w-20 h-20 text-primary mx-auto mb-6" />
              <h1 className="text-3xl font-semibold mb-3 uppercase font-[Inter]">
                Successfully Submitted Partner Request
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Thank you for your interest in partnering with The Quantum Club. 
                Your strategist is reviewing your request now.
              </p>
              {companyName && (
                <p className="text-sm text-muted-foreground mt-2">
                  Company: <span className="font-medium">{decodeURIComponent(companyName)}</span>
                </p>
              )}
            </div>

            <div className="max-w-2xl mx-auto">
              <PartnerRequestTracker />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button size="lg" onClick={() => navigate("/companies")}>
                View Companies
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/home")}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
