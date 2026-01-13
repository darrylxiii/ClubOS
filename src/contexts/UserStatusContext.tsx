import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

  const fetchUserStatus = useCallback(async () => {
    if (!user) {
      setAccountStatus(null);
      setOnboardingCompleted(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch profile and user roles in parallel
      const [profileResult, userRolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('account_status, onboarding_completed_at')
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
      ]);

      const { data: profile, error: profileError } = profileResult;
      const { data: userRoles } = userRolesResult;

      // Handle missing profile gracefully
      if (profileError || !profile) {
        logger.warn("[UserStatusContext] No profile found for user, using safe defaults", { profileError });
        setOnboardingCompleted(false);
        setAccountStatus('pending');
        return;
      }

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
    } catch (error) {
      logger.error("[UserStatusContext] Error fetching status:", error);
      setOnboardingCompleted(false);
      setAccountStatus('pending');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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
