/**
 * Database Health Check Utility
 * Monitors connectivity to critical tables
 */

import { supabase } from "@/integrations/supabase/client";

export interface HealthCheckResult {
  profiles: boolean;
  user_roles: boolean;
  user_preferences: boolean;
  timestamp: number;
}

export const checkDatabaseHealth = async (): Promise<HealthCheckResult> => {
  const checks: HealthCheckResult = {
    profiles: false,
    user_roles: false,
    user_preferences: false,
    timestamp: Date.now(),
  };
  
  try {
    // Check profiles table
    const { error: profilesError } = await Promise.race([
      supabase.from('profiles').select('id').limit(1),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]).catch(() => ({ error: 'timeout' }));
    checks.profiles = !profilesError;
    
    // Check user_roles table
    const { error: rolesError } = await Promise.race([
      supabase.from('user_roles').select('id').limit(1),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]).catch(() => ({ error: 'timeout' }));
    checks.user_roles = !rolesError;
    
    // Check user_preferences table
    const { error: prefsError } = await Promise.race([
      supabase.from('user_preferences').select('id').limit(1),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]).catch(() => ({ error: 'timeout' }));
    checks.user_preferences = !prefsError;
    
  } catch (err) {
    console.error('[Health Check] Database unreachable:', err);
  }
  
  return checks;
};
