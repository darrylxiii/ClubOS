import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  autoLoad?: boolean; // Kept for API compatibility, but React Query handles this via 'enabled'
  onError?: (error: Error) => void;
}

export const useProfile = (options: UseProfileOptions = {}) => {
  const { userId, autoLoad = true } = options;
  const queryClient = useQueryClient();

  // 1. Resolve effective User ID (prop or current session)
  // Note: We use a separate query for session to ensure we don't block render if ID is missing initially
  const { data: sessionData } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: Infinity, // Session doesn't change often without page reload
    enabled: !userId, // Only fetch session if specific userId wasn't provided
  });

  const targetId = userId || sessionData?.id;

  // 2. Main Profile Query
  const {
    data: profile,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['profile', targetId],
    queryFn: async () => {
      if (!targetId) return null;
      console.log('[useProfile] ⚡ Fetching profile for:', targetId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!targetId && autoLoad,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
  });

  // 3. Mutation for updates
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!targetId) throw new Error('No user ID found');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (updatedProfile) => {
      toast.success('Profile updated successfully');
      // Update cache instantly
      queryClient.setQueryData(['profile', targetId], updatedProfile);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update profile');
      options.onError?.(err);
    }
  });

  return {
    profile: profile || null,
    loading,
    error: error as Error | null,
    loadProfile: refetch, // Alias for backward compatibility
    updateProfile: updateMutation.mutateAsync,
    refetch,
    isUpdating: updateMutation.isPending
  };
};
