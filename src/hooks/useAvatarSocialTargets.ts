import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type SocialPlatform = 'linkedin' | 'twitter' | 'reddit' | 'instagram';

export interface AvatarSocialTarget {
  id: string;
  account_id: string;
  platform: SocialPlatform;
  platform_handle: string | null;
  platform_url: string | null;
  weekly_target: number;
  weekly_posts_done: number;
  weekly_reset_at: string;
  responsible_user_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string; icon: string; color: string }[] = [
  { value: 'linkedin', label: 'LinkedIn', icon: 'Linkedin', color: 'text-blue-500' },
  { value: 'twitter', label: 'Twitter/X', icon: 'Twitter', color: 'text-sky-400' },
  { value: 'reddit', label: 'Reddit', icon: 'MessageSquare', color: 'text-orange-500' },
  { value: 'instagram', label: 'Instagram', icon: 'Instagram', color: 'text-pink-500' },
];

export function useAvatarSocialTargets(accountId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const targetsQuery = useQuery({
    queryKey: ['avatar-social-targets', accountId],
    queryFn: async () => {
      let query = supabase
        .from('avatar_social_targets')
        .select('*')
        .order('platform');
      if (accountId) {
        query = query.eq('account_id', accountId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as AvatarSocialTarget[];
    },
    enabled: !!user,
  });

  const allTargetsQuery = useQuery({
    queryKey: ['avatar-social-targets-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avatar_social_targets')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as AvatarSocialTarget[];
    },
    enabled: !!user && !accountId,
  });

  const logSocialPost = useMutation({
    mutationFn: async ({ targetId, count = 1 }: { targetId: string; count?: number }) => {
      const target = targetsQuery.data?.find(t => t.id === targetId);
      if (!target) throw new Error('Target not found');
      const newCount = target.weekly_posts_done + count;
      const { error } = await supabase
        .from('avatar_social_targets')
        .update({ weekly_posts_done: newCount } as any)
        .eq('id', targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar-social-targets'] });
      queryClient.invalidateQueries({ queryKey: ['avatar-social-targets-all'] });
      toast.success('Post logged.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upsertSocialTarget = useMutation({
    mutationFn: async (target: Partial<AvatarSocialTarget> & { account_id: string; platform: SocialPlatform }) => {
      const { data, error } = await supabase
        .from('avatar_social_targets')
        .upsert(target as any, { onConflict: 'account_id,platform' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar-social-targets'] });
      queryClient.invalidateQueries({ queryKey: ['avatar-social-targets-all'] });
      toast.success('Social target saved.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSocialTarget = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase
        .from('avatar_social_targets')
        .delete()
        .eq('id', targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar-social-targets'] });
      queryClient.invalidateQueries({ queryKey: ['avatar-social-targets-all'] });
      toast.success('Social target removed.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    targets: targetsQuery.data ?? [],
    allTargets: allTargetsQuery.data ?? [],
    isLoading: targetsQuery.isLoading,
    logSocialPost,
    upsertSocialTarget,
    deleteSocialTarget,
  };
}
