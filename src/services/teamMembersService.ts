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
    // Add timeout to prevent indefinite hangs
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Team members query timeout')), 5000);
    });

    // Step 1: Get user IDs with specific roles
    const roleQuery = supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'strategist', 'partner']);

    const { data: roleData, error: roleError } = await Promise.race([
      roleQuery,
      timeoutPromise
    ]) as any;

    if (roleError) throw roleError;
    if (!roleData || roleData.length === 0) return [];

    // Create a map of user_id to roles (a user can have multiple roles)
    const userRolesMap = new Map<string, string>();
    roleData.forEach((record) => {
      // If user has multiple roles, pick the highest priority one
      if (!userRolesMap.has(record.user_id)) {
        userRolesMap.set(record.user_id, record.role);
      } else {
        const currentRole = userRolesMap.get(record.user_id);
        // Priority: admin > strategist > partner
        if (record.role === 'admin' || 
            (record.role === 'strategist' && currentRole !== 'admin')) {
          userRolesMap.set(record.user_id, record.role);
        }
      }
    });

    // Step 2: Fetch profiles for these users
    const userIds = Array.from(userRolesMap.keys());
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds)
      .order('full_name', { ascending: true });

    if (profileError) throw profileError;

    // Step 3: Combine and transform
    const members: TeamMember[] = (profiles || []).map((profile) => ({
      id: profile.id,
      full_name: profile.full_name || 'Unknown User',
      email: profile.email || '',
      avatar_url: profile.avatar_url || undefined,
      role: userRolesMap.get(profile.id)
    }));

    return members;
  } catch (error) {
    console.error('Error fetching team members:', error);
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
