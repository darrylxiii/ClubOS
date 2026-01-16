import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AccountStatus = 'active' | 'suspended' | 'banned' | 'pending_review' | 'read_only';

export interface UserAccountInfo {
  id: string;
  account_status: AccountStatus;
  suspension_reason?: string;
  suspended_at?: string;
  ban_reason?: string;
  banned_at?: string;
  force_password_reset?: boolean;
  force_password_reset_reason?: string;
}

export function useGodMode() {
  const [isLoading, setIsLoading] = useState(false);

  const suspendUser = async (userId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('suspend_user', {
        p_target_user_id: userId,
        p_reason: reason ?? undefined,
      });
      
      if (error) throw error;
      toast.success('User suspended successfully');
      return true;
    } catch (error: any) {
      console.error('Error suspending user:', error);
      toast.error(error.message || 'Failed to suspend user');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsuspendUser = async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('unsuspend_user', {
        p_target_user_id: userId,
      });
      
      if (error) throw error;
      toast.success('User unsuspended successfully');
      return true;
    } catch (error: any) {
      console.error('Error unsuspending user:', error);
      toast.error(error.message || 'Failed to unsuspend user');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const banUser = async (userId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('ban_user', {
        p_target_user_id: userId,
        p_reason: reason ?? undefined,
      });
      
      if (error) throw error;
      toast.success('User banned successfully');
      return true;
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast.error(error.message || 'Failed to ban user');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unbanUser = async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('unban_user', {
        p_target_user_id: userId,
      });
      
      if (error) throw error;
      toast.success('User unbanned successfully');
      return true;
    } catch (error: any) {
      console.error('Error unbanning user:', error);
      toast.error(error.message || 'Failed to unban user');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const forcePasswordReset = async (userId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('force_user_password_reset', {
        p_target_user_id: userId,
        p_reason: reason ?? undefined,
      });
      
      if (error) throw error;
      toast.success('Password reset forced - user will be prompted on next login');
      return true;
    } catch (error: any) {
      console.error('Error forcing password reset:', error);
      toast.error(error.message || 'Failed to force password reset');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearPasswordReset = async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('clear_force_password_reset', {
        p_target_user_id: userId,
      });
      
      if (error) throw error;
      toast.success('Password reset requirement cleared');
      return true;
    } catch (error: any) {
      console.error('Error clearing password reset:', error);
      toast.error(error.message || 'Failed to clear password reset');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const promoteToSuperAdmin = async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('promote_to_super_admin', {
        p_target_user_id: userId,
      });
      
      if (error) throw error;
      toast.success('User promoted to Super Admin');
      return true;
    } catch (error: any) {
      console.error('Error promoting to super admin:', error);
      toast.error(error.message || 'Failed to promote to super admin');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const demoteFromSuperAdmin = async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('demote_from_super_admin', {
        p_target_user_id: userId,
      });
      
      if (error) throw error;
      toast.success('User demoted from Super Admin');
      return true;
    } catch (error: any) {
      console.error('Error demoting from super admin:', error);
      toast.error(error.message || 'Failed to demote from super admin');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkIsSuperAdmin = async (userId?: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_super_admin', {
        check_user_id: userId || undefined,
      });
      
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
  };

  const checkCanModifyUser = async (targetUserId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('can_modify_user', {
        target_user_id: targetUserId,
      });
      
      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking modify permissions:', error);
      return false;
    }
  };

  return {
    isLoading,
    suspendUser,
    unsuspendUser,
    banUser,
    unbanUser,
    forcePasswordReset,
    clearPasswordReset,
    promoteToSuperAdmin,
    demoteFromSuperAdmin,
    checkIsSuperAdmin,
    checkCanModifyUser,
  };
}
