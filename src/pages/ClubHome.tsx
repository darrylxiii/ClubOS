import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { CandidateHome } from "@/components/clubhome/CandidateHome";
import { PartnerHome } from "@/components/clubhome/PartnerHome";
import { AdminHome } from "@/components/clubhome/AdminHome";
import { ClubHomeHeader } from "@/components/clubhome/ClubHomeHeader";
import { BackgroundVideo } from "@/components/BackgroundVideo";

const ClubHome = () => {
  const { currentRole: role, loading } = useRole();
  const { user } = useAuth();
  const navigate = useNavigate();

  console.log('🏠 [ClubHome] Rendering - role:', role, 'loading:', loading);

  // Check if onboarding is complete (Phase 3)
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!loading && user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed_at')
            .eq('id', user.id)
            .single();
          
          if (!profile?.onboarding_completed_at) {
            console.log('[ClubHome] Incomplete onboarding detected, redirecting to OAuth onboarding');
            navigate("/oauth-onboarding", { replace: true });
            return;
          }
        } catch (error) {
          console.error('[ClubHome] Error checking onboarding:', error);
        }
      }
    };
    
    checkOnboarding();
  }, [loading, user, navigate]);

  useEffect(() => {
    // Give extra time for role to load before redirecting
    // This prevents redirect loops when network is slow
    if (!loading && !role) {
      const timeout = setTimeout(() => {
        console.log('[ClubHome] No role detected after loading, redirecting to auth');
        navigate("/auth", { replace: true });
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [loading, role, navigate]);

  // Debugging: log current role
  useEffect(() => {
    if (!loading) {
      console.log('[ClubHome] Current role:', role);
    }
  }, [role, loading]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const renderRoleView = () => {
    switch (role) {
      case 'admin':
        return <AdminHome />;
      case 'partner':
        return <PartnerHome />;
      case 'strategist':
        return <CandidateHome />; // Strategists see candidate view by default
      case 'user':
      default:
        return <CandidateHome />;
    }
  };

  return (
    <AppLayout>
      <BackgroundVideo />

      <div className="relative z-10 container mx-auto py-8 space-y-8 animate-fade-in">
        <ClubHomeHeader role={role} />
        <div className="glass-card">
          {renderRoleView()}
        </div>
      </div>
    </AppLayout>
  );
};

export default ClubHome;
