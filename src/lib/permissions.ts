import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'moderator' | 'user';

export interface ChannelPermissions {
  can_view: boolean;
  can_join: boolean;
  can_speak: boolean;
  can_video: boolean;
  can_screen_share: boolean;
  can_manage_messages: boolean;
}

// Check if user has a specific role
export async function hasRole(userId: string, role: UserRole): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', {
    _user_id: userId,
    _role: role,
  });

  if (error) {
    console.error('Error checking role:', error);
    return false;
  }

  return data;
}

// Get user's highest role
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase.rpc('get_user_role', {
    _user_id: userId,
  });

  if (error) {
    console.error('Error getting user role:', error);
    return null;
  }

  return data as UserRole;
}

// Get channel permissions for a role
export async function getChannelPermissions(
  channelId: string,
  role: UserRole
): Promise<ChannelPermissions> {
  const { data, error } = await supabase
    .from('live_channel_permissions')
    .select('*')
    .eq('channel_id', channelId)
    .eq('role', role)
    .single();

  if (error || !data) {
    // Default permissions for users if not set
    return {
      can_view: true,
      can_join: true,
      can_speak: true,
      can_video: true,
      can_screen_share: role === 'admin' || role === 'moderator',
      can_manage_messages: role === 'admin' || role === 'moderator',
    };
  }

  return {
    can_view: data.can_view,
    can_join: data.can_join,
    can_speak: data.can_speak,
    can_video: data.can_video,
    can_screen_share: data.can_screen_share,
    can_manage_messages: data.can_manage_messages,
  };
}

// Assign role to user
export async function assignRole(
  userId: string,
  role: UserRole,
  assignedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role,
      assigned_by: assignedBy,
    });

  if (error) {
    console.error('Error assigning role:', error);
    return false;
  }

  return true;
}

// Remove role from user
export async function removeRole(userId: string, role: UserRole): Promise<boolean> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  if (error) {
    console.error('Error removing role:', error);
    return false;
  }

  return true;
}

// Set channel permissions
export async function setChannelPermissions(
  channelId: string,
  role: UserRole,
  permissions: Partial<ChannelPermissions>
): Promise<boolean> {
  const { error } = await supabase
    .from('live_channel_permissions')
    .upsert({
      channel_id: channelId,
      role,
      ...permissions,
    });

  if (error) {
    console.error('Error setting permissions:', error);
    return false;
  }

  return true;
}
