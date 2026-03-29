import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { migrateToast as toast } from '@/lib/notify';
import { UserPlus, UserMinus } from 'lucide-react';

interface FollowButtonProps {
  userId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function FollowButton({ 
  userId, 
  variant = 'default', 
  size = 'default',
  showLabel = true 
}: FollowButtonProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkFollowStatus();
  }, [userId, user]);

  const checkFollowStatus = async () => {
    if (!user || user.id === userId) return;

    try {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      // Not following
      setIsFollowing(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast({ title: t('profileSection.followSignIn'), variant: 'destructive' });
      return;
    }

    if (user.id === userId) {
      toast({ title: t('profileSection.cannotFollowSelf'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
        setIsFollowing(false);
        toast({ title: t('profileSection.unfollowedSuccess') });
      } else {
        // Follow
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId,
          });

        if (error) throw error;
        setIsFollowing(true);
        toast({ title: t('profileSection.followingSuccess') });

        // Create notification for the followed user
        await supabase.from('notifications').insert({
          user_id: userId,
          title: t('profileSection.newFollower'),
          message: t('profileSection.someoneFollowedYou'),
          type: 'follow',
          category: 'social',
          action_url: `/profile/${user.id}`,
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: t('common:status.error'),
        description: t('profileSection.failedFollowStatus'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show button for own profile
  if (!user || user.id === userId) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleFollow}
      disabled={loading}
      className="gap-2"
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4" />
          {showLabel && t('profileSection.unfollow')}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          {showLabel && t('profileSection.follow')}
        </>
      )}
    </Button>
  );
}
