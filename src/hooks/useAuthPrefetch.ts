import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/roles';
import { logger } from '@/lib/logger';

export interface CompanyMembership {
  company_id: string;
  role: string;
  company_name?: string;
  company_logo_url?: string | null;
}

export interface AuthPrefetchData {
  roles: UserRole[];
  profile: {
    account_status: string | null;
    onboarding_completed_at: string | null;
    company_id: string | null;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    current_title: string | null;
  } | null;
  /** @deprecated Use companyMemberships instead */
  companyMembership: CompanyMembership | null;
  companyMemberships: CompanyMembership[];
  activeCompanyId: string | null;
  preferences: Record<string, unknown> | null;
  mfaFactors: { hasVerifiedTotp: boolean };
}

async function fetchAuthData(userId: string): Promise<AuthPrefetchData> {
  const startTime = Date.now();

  const [rolesResult, profileResult, prefsResult, mfaResult, companyMemberResult] = await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase
      .from('profiles')
      .select('account_status, onboarding_completed_at, company_id, full_name, avatar_url, phone, current_title')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.auth.mfa.listFactors(),
    supabase
      .from('company_members')
      .select('company_id, role, companies:company_id(name, logo_url)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
  ]);

  const roles: UserRole[] = ['user'];
  if (!rolesResult.error && rolesResult.data?.length) {
    const fetched = rolesResult.data.map((r) => r.role as UserRole);
    fetched.forEach((r) => {
      if (!roles.includes(r)) roles.push(r);
    });
  }

  const profile = profileResult.data
    ? {
        account_status: profileResult.data.account_status,
        onboarding_completed_at: profileResult.data.onboarding_completed_at,
        company_id: profileResult.data.company_id,
        full_name: profileResult.data.full_name ?? null,
        avatar_url: profileResult.data.avatar_url ?? null,
        phone: profileResult.data.phone ?? null,
        current_title: profileResult.data.current_title ?? null,
      }
    : null;

  const verifiedTotp =
    mfaResult.data?.totp?.filter((f) => f.status === 'verified') || [];

  logger.info('[useAuthPrefetch] Fetched in', { elapsed: Date.now() - startTime });

  const companyMemberships: CompanyMembership[] = (companyMemberResult.data || []).map((m) => ({
    company_id: m.company_id,
    role: m.role,
    company_name: (m.companies as { name: string; logo_url: string | null } | null)?.name ?? undefined,
    company_logo_url: (m.companies as { name: string; logo_url: string | null } | null)?.logo_url ?? null,
  }));

  const activeCompanyId = (prefsResult.data as { active_company_id?: string | null } | null)?.active_company_id ?? null;

  return {
    roles,
    profile,
    companyMembership: companyMemberships[0] || null,
    companyMemberships,
    activeCompanyId,
    preferences: prefsResult.data || null,
    mfaFactors: { hasVerifiedTotp: verifiedTotp.length > 0 },
  };
}

/**
 * Single parallel fetch for all auth-related data.
 * Results are cached via React Query so RoleContext, AppearanceContext,
 * ProtectedRoute, and MfaEnforcementGuard all read from cache.
 */
export function useAuthPrefetch() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['auth-prefetch', user?.id],
    queryFn: () => fetchAuthData(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 min
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
