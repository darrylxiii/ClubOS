import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  header_media_url?: string | null;
  header_media_type?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  company_id?: string | null;
  profile_slug?: string | null;
  [key: string]: any;
}

interface UseProfileOptions {
  userId?: string;
  autoLoad?: boolean;
  onError?: (error: Error) => void;
}

export const useProfile = (options: UseProfileOptions = {}) => {
  const { userId, autoLoad = true, onError } = options;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(autoLoad);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = useCallback(async (targetUserId?: string) => {
    let idToLoad = targetUserId || userId;

    if (!idToLoad) {
      const { data: { user } } = await supabase.auth.getUser();
      idToLoad = user?.id;
    }

    if (!idToLoad) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', idToLoad)
        .single();

      if (fetchError) throw fetchError;

      setProfile(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load profile');
      setError(error);
      onError?.(error);
      console.error('[useProfile] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, onError]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!profile?.id) {
      throw new Error('No profile loaded');
    }

    setLoading(true);
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data);
      toast.success('Profile updated successfully');
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update profile');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const refetch = useCallback(() => {
    return loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    console.log('[useProfile] Effect triggered - autoLoad:', autoLoad, 'userId:', userId);
    if (autoLoad) {
      console.log('[useProfile] 🔄 Loading profile (userId provided or fetching current)');
      loadProfile();
    }
  }, [autoLoad, userId, loadProfile]);

  return {
    profile,
    loading,
    error,
    loadProfile,
    updateProfile,
    refetch,
  };
};
