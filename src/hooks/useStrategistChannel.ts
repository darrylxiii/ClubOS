import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StrategistProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  title: string | null;
}

export interface StrategistActivity {
  id: string;
  type: 'review' | 'shortlist' | 'interview' | 'note' | 'meeting';
  description: string;
  context: string | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

export interface StrategistNote {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
}

interface StrategistChannelResult {
  strategist: StrategistProfile | null;
  activities: StrategistActivity[];
  notes: StrategistNote[];
  isLoading: boolean;
}

export function useStrategistChannel(companyId: string | undefined): StrategistChannelResult {
  // Fetch strategist assignment + profile
  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['strategist-channel-assignment', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      try {
        const { data, error } = await supabase
          .from('company_strategist_assignments' as any)
          .select(`
            *,
            strategist:profiles!company_strategist_assignments_strategist_id_fkey(
              id,
              full_name,
              email,
              avatar_url,
              title
            )
          `)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
      } catch (err) {
        console.error('[useStrategistChannel] Assignment fetch error:', err);
        return null;
      }
    },
    enabled: !!companyId,
  });

  const strategistId = (assignment as any)?.strategist?.id;

  // Fetch recent strategist activity for this company
  const { data: activitiesRaw, isLoading: activitiesLoading } = useQuery({
    queryKey: ['strategist-channel-activities', companyId, strategistId],
    queryFn: async () => {
      if (!companyId || !strategistId) return [];
      try {
        // Fetch meetings the strategist organized for this company
        const { data: meetings } = await supabase
          .from('meetings')
          .select('id, title, scheduled_at, meeting_type, created_at')
          .eq('company_id', companyId)
          .eq('organizer_id', strategistId)
          .order('created_at', { ascending: false })
          .limit(20);

        // Fetch company_members activity (profiles reviewed, shortlists)
        const { data: memberActivities } = await supabase
          .from('company_members')
          .select('id, role, joined_at, user_id')
          .eq('company_id', companyId)
          .order('joined_at', { ascending: false })
          .limit(20);

        const activities: StrategistActivity[] = [];

        // Map meetings to activities
        (meetings || []).forEach((m: any) => {
          activities.push({
            id: `meeting-${m.id}`,
            type: 'meeting',
            description: m.title || 'Scheduled a meeting',
            context: m.meeting_type || null,
            created_at: m.created_at || m.scheduled_at,
            metadata: { scheduled_at: m.scheduled_at },
          });
        });

        // Map member activities (strategist adding team members)
        (memberActivities || []).forEach((ma: any) => {
          if (ma.user_id === strategistId) return; // skip self
          activities.push({
            id: `member-${ma.id}`,
            type: 'review',
            description: `Reviewed team member (${ma.role || 'member'})`,
            context: null,
            created_at: ma.joined_at,
            metadata: null,
          });
        });

        // Sort by date descending
        activities.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return activities.slice(0, 30);
      } catch (err) {
        console.error('[useStrategistChannel] Activities fetch error:', err);
        return [];
      }
    },
    enabled: !!companyId && !!strategistId,
  });

  // Fetch shared notes (activities where type = 'note' involving strategist)
  const { data: notesRaw, isLoading: notesLoading } = useQuery({
    queryKey: ['strategist-channel-notes', companyId, strategistId],
    queryFn: async () => {
      if (!companyId || !strategistId) return [];
      try {
        // Use CRM activities for note exchange between partner and strategist
        const { data, error } = await supabase
          .from('crm_activities')
          .select(`
            id,
            type,
            notes,
            created_at,
            created_by,
            creator:profiles!crm_activities_created_by_fkey(
              id,
              full_name,
              avatar_url
            )
          `)
          .eq('company_id', companyId)
          .eq('type', 'note')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        return (data || []).map((item: any) => ({
          id: item.id,
          author_id: item.created_by || '',
          author_name: item.creator?.full_name || 'Unknown',
          author_avatar: item.creator?.avatar_url || null,
          content: item.notes || '',
          created_at: item.created_at,
        }));
      } catch (err) {
        console.error('[useStrategistChannel] Notes fetch error:', err);
        return [];
      }
    },
    enabled: !!companyId && !!strategistId,
  });

  const strategist: StrategistProfile | null = (assignment as any)?.strategist
    ? {
        id: (assignment as any).strategist.id,
        full_name: (assignment as any).strategist.full_name || '',
        email: (assignment as any).strategist.email || '',
        avatar_url: (assignment as any).strategist.avatar_url || null,
        title: (assignment as any).strategist.title || null,
      }
    : null;

  return {
    strategist,
    activities: activitiesRaw || [],
    notes: notesRaw || [],
    isLoading: assignmentLoading || activitiesLoading || notesLoading,
  };
}
