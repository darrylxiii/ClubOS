import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Phone, Video, Shield, User } from 'lucide-react';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { getUserRole, type UserRole } from '@/lib/permissions';

interface UserProfileCardProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  status_message: string | null;
  custom_status: string | null;
  status_emoji: string | null;
}

export function UserProfileCard({ userId, open, onOpenChange }: UserProfileCardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { getOrCreateConversation } = useDirectMessages();

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      // Load basic profile
      const { data: basicProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', userId)
        .single();

      // Load extended profile
      const { data: extendedProfile } = await supabase
        .from('user_profiles_extended')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile({
        ...basicProfile,
        ...extendedProfile,
      });

      // Load role
      const userRole = await getUserRole(userId);
      setRole(userRole);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const conversationId = await getOrCreateConversation(userId);
    if (conversationId) {
      // This would ideally trigger the parent to select the conversation
      // For now, just close the profile
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-auto max-w-md p-0">
        {loading || !profile ? (
          <div className="p-6 w-80">
            <div className="animate-pulse space-y-4">
              <div className="h-20 w-20 rounded-full bg-muted mx-auto" />
              <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Avatar and Name */}
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg">{profile.full_name || 'Unknown User'}</h3>
              {role && (
                <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="mt-1">
                  <Shield className="h-3 w-3 mr-1" />
                  {role}
                </Badge>
              )}
            </div>

            {/* Custom Status */}
            {(profile.status_emoji || profile.custom_status) && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {profile.status_emoji && <span className="text-lg">{profile.status_emoji}</span>}
                {profile.custom_status && <span>{profile.custom_status}</span>}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              </>
            )}

            {/* Actions */}
            <Separator />
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={handleSendMessage}>
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Video className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
