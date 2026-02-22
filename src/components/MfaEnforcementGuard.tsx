import { useState, useEffect, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/PageLoader";

interface MfaEnforcementGuardProps {
  children: ReactNode;
  requiredRoles?: string[];
}

/**
 * Guard component that enforces MFA enrollment for admin/strategist roles.
 * Wraps protected routes and redirects elevated-role users to /mfa-setup
 * if they don't have a verified TOTP factor.
 */
export function MfaEnforcementGuard({ 
  children, 
  requiredRoles = ['admin', 'strategist'] 
}: MfaEnforcementGuardProps) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [needsMfa, setNeedsMfa] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    const checkMfaEnrollment = async () => {
      try {
        // Check user roles
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        const roles = userRoles?.map(r => r.role) || [];
        const hasElevatedRole = roles.some(r => requiredRoles.includes(r));

        if (!hasElevatedRole) {
          setChecking(false);
          return;
        }

        // User has elevated role — check MFA factors
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const verifiedTotpFactors = factorsData?.totp?.filter(
          f => f.status === 'verified'
        ) || [];

        if (verifiedTotpFactors.length === 0) {
          setNeedsMfa(true);
        }
      } catch (err) {
        console.error('[MfaEnforcementGuard] Error checking MFA:', err);
        // Fail open — don't block access on errors
      } finally {
        setChecking(false);
      }
    };

    checkMfaEnrollment();
  }, [user, requiredRoles]);

  if (checking) return <PageLoader />;

  if (needsMfa) {
    return <Navigate to="/mfa-setup" replace />;
  }

  return <>{children}</>;
}
