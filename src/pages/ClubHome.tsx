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
  const navigationAttempts = useRef(0);
  const hasNavigated = useRef(false);
  const [emergencyTimeout, setEmergencyTimeout] = useState(false);
  const [loadingStartTime] = useState(Date.now());

  // ENTERPRISE: Combined loading state - wait for BOTH auth AND role
  const isReady = !roleLoading && !authLoading && role !== null;

  console.log('🏠 [ClubHome] State:', {
    roleLoading,
    authLoading,
    isReady,
    role,
    user: !!user,
    pathname: window.location.pathname,
    timestamp: Date.now()
  });

  // ENTERPRISE: Session storage coordination - prevent navigation loops
  useEffect(() => {
    const lastNavigationTime = sessionStorage.getItem('last_clubhome_check');
    const now = Date.now();

    if (lastNavigationTime && (now - parseInt(lastNavigationTime)) < 3000) {
      console.warn('[ClubHome] ⚠️ Rapid navigation detected - preventing loop');
      navigationAttempts.current++;
      
      if (navigationAttempts.current > 5) {
        console.error('[ClubHome] 🚨 Navigation loop detected!');
        toast.error('Navigation error detected. Please refresh the page.', {
          duration: 10000,
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload()
          }
        });
        return;
      }
    }

    sessionStorage.setItem('last_clubhome_check', now.toString());
  }, []);

  // PHASE 1: Emergency timeout - force render after 10s max
  useEffect(() => {
    const elapsed = Date.now() - loadingStartTime;
    const timeoutDuration = 10000 - elapsed; // Account for already elapsed time
    
    const timer = setTimeout(() => {
      if (!isReady && !emergencyTimeout) {
        console.error('[ClubHome] 🚨 EMERGENCY: Loading timeout after 10s - forcing render');
        setEmergencyTimeout(true);
        toast.error('Workspace loading slowly - showing default view', {
          duration: 5000,
          action: {
            label: 'Reload',
            onClick: () => window.location.reload()
          }
        });
      }
    }, Math.max(timeoutDuration, 0));
    
    return () => clearTimeout(timer);
  }, [isReady, emergencyTimeout, loadingStartTime]);

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

  // PHASE 1: Render logic with emergency override
  if (!isReady && !emergencyTimeout) {
    const elapsed = Math.floor((Date.now() - loadingStartTime) / 1000);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">Loading your workspace...</p>
            <p className="text-sm text-muted-foreground">
              {authLoading && "Authenticating..."}
              {!authLoading && roleLoading && "Setting up your profile..."}
              {!authLoading && !roleLoading && "Almost ready..."}
            </p>
            {elapsed > 5 && (
              <p className="text-xs text-muted-foreground/70 mt-2">
                Taking longer than expected... ({elapsed}s)
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // PHASE 1: Use effective role (fallback to 'user' on emergency timeout)
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
