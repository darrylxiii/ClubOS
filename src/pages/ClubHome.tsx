import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CandidateHome } from "@/components/clubhome/CandidateHome";
import { PartnerHome } from "@/components/clubhome/PartnerHome";
import { AdminHome } from "@/components/clubhome/AdminHome";
import { ClubHomeHeader } from "@/components/clubhome/ClubHomeHeader";
import { BackgroundVideo } from "@/components/BackgroundVideo";

const ClubHome = () => {
  const { currentRole: role, loading: roleLoading } = useRole();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  // Combined loading state
  const isReady = !roleLoading && !authLoading && role !== null;

  console.log('🏠 [ClubHome] State:', {
    roleLoading,
    authLoading,
    isReady,
    role,
    user: !!user
  });

  // Check if onboarding is complete (Phase 3)
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!roleLoading && user) {
        // Check if we already validated onboarding (from Auth page)
        const onboardingChecked = sessionStorage.getItem('onboarding_checked');
        if (onboardingChecked === 'true') {
          console.log('[ClubHome] ✅ Onboarding already checked by Auth page, skipping');
          sessionStorage.removeItem('onboarding_checked');
          return; // Skip check, Auth page already handled it
        }

        console.log('[ClubHome] 🔍 Checking onboarding status (direct navigation)');
        
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed_at')
            .eq('id', user.id)
            .single();
          
          console.log('[ClubHome] 📋 Profile data:', { 
            userId: user.id, 
            onboardingComplete: !!profile?.onboarding_completed_at 
          });
          
          if (!profile?.onboarding_completed_at) {
            console.log('[ClubHome] 🔄 Navigation: Incomplete onboarding, going to /oauth-onboarding');
            navigate("/oauth-onboarding", { replace: true });
            return;
          }
        } catch (error) {
          console.error('[ClubHome] ❌ Error checking onboarding:', error);
        }
      }
    };
    
    checkOnboarding();
  }, [roleLoading, user, navigate]);

  // ENTERPRISE: Fixed race condition - only redirect if truly unauthenticated
  // CRITICAL: Check BOTH role AND user, increased timeout from 1s -> 5s
  useEffect(() => {
    if (!roleLoading && !authLoading && !role && !user && !hasNavigated.current) {
      const timeout = setTimeout(() => {
        // Double-check before navigating to prevent race conditions
        if (!role && !user && window.location.pathname === '/home') {
          hasNavigated.current = true;
          console.error('[ClubHome] 🚨 No role AND no user - authentication required');
          navigate("/auth", { replace: true });
        }
      }, 5000); // Increased from 1s to 5s
      
      return () => clearTimeout(timeout);
    }
  }, [roleLoading, authLoading, role, user, navigate]);

  // Show simple loading state
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const effectiveRole = role || 'user';

  const renderRoleView = () => {
    switch (effectiveRole) {
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
        <ClubHomeHeader role={effectiveRole} />
        <div className="glass-card">
          {renderRoleView()}
        </div>
      </div>
    </AppLayout>
  );
};

export default ClubHome;
