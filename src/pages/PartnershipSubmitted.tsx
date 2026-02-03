import { useParams, useNavigate, useLocation } from "react-router-dom";
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

// Navigation state from FunnelSteps
interface LocationState {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  estimatedRolesPerYear?: number;
}

// Platform average fee (matches platform_settings.estimated_placement_fee)
const AVERAGE_PLACEMENT_FEE = 15000;

export default function PartnershipSubmitted() {
  const { companyName } = useParams<{ companyName?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state as LocationState | null;

  useEffect(() => {
    // Track page view for Google Tag Manager with Enhanced Conversions data
    if (window.dataLayer) {
      const decodedName = companyName ? decodeURIComponent(companyName) : undefined;
      
      // Parse name into first/last for Enhanced Conversions
      const nameParts = (state?.contactName || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Calculate potential conversion value (roles × average placement fee)
      const estimatedRoles = state?.estimatedRolesPerYear || 0;
      const conversionValue = estimatedRoles * AVERAGE_PLACEMENT_FEE;

      window.dataLayer.push({
        event: 'partnership_submitted',
        companyName: decodedName,
        
        // Enhanced Conversions user data (Google Ads schema)
        user_data: {
          email: state?.contactEmail?.toLowerCase().trim(),
          phone_number: state?.contactPhone, // E.164 format
          address: {
            first_name: firstName,
            last_name: lastName,
          }
        },
        
        // Conversion value for Google Ads Smart Bidding
        value: conversionValue,
        currency: 'EUR',
        estimated_roles: estimatedRoles,
        
        // Flat fields for flexibility with other tools
        userEmail: state?.contactEmail?.toLowerCase().trim(),
        userName: state?.contactName,
        userPhone: state?.contactPhone,
      });
    }
  }, [companyName, state]);

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
