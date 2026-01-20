import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface UserStatus {
  accountStatus: 'approved' | 'pending' | 'declined' | null;
  onboardingCompleted: boolean | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const UserStatusContext = createContext<UserStatus | undefined>(undefined);

/**
 * Cached user status provider to prevent duplicate profile/role fetches
 * across ProtectedRoute and other components
 */
export function UserStatusProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [accountStatus, setAccountStatus] = useState<'approved' | 'pending' | 'declined' | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadingStartRef = useRef<number | null>(null);

  const fetchUserStatus = useCallback(async () => {
    if (!user) {
      setAccountStatus(null);
      setOnboardingCompleted(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      loadingStartRef.current = Date.now();
      
      // Fetch profile and user roles in parallel
      const [profileResult, userRolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('account_status, onboarding_completed_at')
          .eq('id', user.id)
          .maybeSingle(), // Changed from .single() to handle missing profiles gracefully
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
      ]);

      const { data: profile, error: profileError } = profileResult;
      const { data: userRoles } = userRolesResult;

      // Handle missing profile gracefully - NO early return to ensure finally runs
      if (profileError || !profile) {
        logger.warn("[UserStatusContext] No profile found for user, using safe defaults", { profileError });
        setOnboardingCompleted(false);
        setAccountStatus('pending');
        // DON'T return here - let finally block run to set isLoading to false
      } else {
        // Check if user has elevated roles
        const roles = userRoles?.map((r) => r.role) || [];
        const isAdmin = roles.includes('admin');
        const isPartner = roles.includes('partner');
        const isStrategist = roles.includes('strategist');
        const isPureCandidate = !isAdmin && !isPartner && !isStrategist;

        // Only pure candidates need to complete onboarding
        // BYPASS: Explicitly skip onboarding for test accounts
        const isTestAccount = user.email?.includes('test') || user.email === 'darryl@thequantumclub.io';
        const needsOnboarding = !isTestAccount && isPureCandidate && !profile.onboarding_completed_at;

        setOnboardingCompleted(!needsOnboarding);
        setAccountStatus((profile.account_status as 'approved' | 'pending' | 'declined') || 'pending');
      }
    } catch (_error) {
      logger.error("[UserStatusContext] Error fetching status:", { error: _error });
      setOnboardingCompleted(false);
      setAccountStatus('pending');
    } finally {
      // CRITICAL: This ALWAYS runs now - fixes the loading deadlock
      setIsLoading(false);
      loadingStartRef.current = null;
    }
  }, [user]);

  // Safety timeout - prevent infinite loading state
  useEffect(() => {
    if (!isLoading) return;
    
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        const elapsed = loadingStartRef.current ? (Date.now() - loadingStartRef.current) / 1000 : 'unknown';
        logger.warn("[UserStatusContext] Safety timeout triggered after 5s - forcing loading to false", { elapsed });
        setIsLoading(false);
        if (accountStatus === null) setAccountStatus('pending');
        if (onboardingCompleted === null) setOnboardingCompleted(false);
      }
    }, 5000);
    
    return () => clearTimeout(safetyTimeout);
  }, [isLoading, accountStatus, onboardingCompleted]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserStatus();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [user, authLoading, fetchUserStatus]);

  return (
    <UserStatusContext.Provider value={{
      accountStatus,
      onboardingCompleted,
      isLoading,
      refetch: fetchUserStatus
    }}>
      {children}
    </UserStatusContext.Provider>
  );
}

export function useUserStatus() {
  const context = useContext(UserStatusContext);
  if (context === undefined) {
    throw new Error('useUserStatus must be used within a UserStatusProvider');
  }
  return context;
}
