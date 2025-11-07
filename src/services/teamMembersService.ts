import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

/**
 * Fetch all team members (admins, strategists, partners) for @mentions
 */
export const getTeamMembersForMentions = async (): Promise<TeamMember[]> => {
  try {
    // Query from user_roles -> profiles (follows foreign key direction)
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        profiles!user_roles_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .in('role', ['admin', 'strategist', 'partner']);

    if (error) throw error;

    // Transform and deduplicate users
    const uniqueMembers = new Map<string, TeamMember>();
    
    (data || []).forEach((roleRecord: any) => {
      const profile = roleRecord.profiles;
      if (profile && !uniqueMembers.has(profile.id)) {
        uniqueMembers.set(profile.id, {
          id: profile.id,
          full_name: profile.full_name || 'Unknown User',
          email: profile.email || '',
          avatar_url: profile.avatar_url,
          role: roleRecord.role
        });
      }
    });

    // Sort by full name
    const members = Array.from(uniqueMembers.values());
    members.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return members;
  } catch (error) {
    console.error('Error fetching team members:', error);
    // Return empty array as fallback - don't break the UI
    return [];
  }
};

/**
 * Get unread mention count for a user
 */
export const getUnreadMentionCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('note_mentions')
      .select('*', { count: 'exact', head: true })
      .eq('mentioned_user_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching unread mention count:', error);
    return 0;
  }
};

/**
 * Mark a mention as read
 */
export const markMentionAsRead = async (mentionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('note_mentions')
      .update({ read_at: new Date().toISOString() })
      .eq('id', mentionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking mention as read:', error);
    return false;
  }
};

/**
 * Get all mentions for a user (for notification center)
 */
export const getUserMentions = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('note_mentions')
      .select(`
        id,
        read_at,
        created_at,
        candidate_notes!inner(
          id,
          title,
          content,
          candidate_id,
          created_by,
          profiles!candidate_notes_created_by_fkey(full_name, avatar_url)
        )
      `)
      .eq('mentioned_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user mentions:', error);
    return [];
  }
};
