import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ActivityType = 'view' | 'edit' | 'comment' | 'share' | 'restore' | 'create' | 'delete' | 'move';

export interface PageActivity {
  id: string;
  page_id: string;
  user_id: string | null;
  activity_type: ActivityType;
  activity_data: Record<string, unknown>;
  created_at: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface PageAnalytics {
  id: string;
  page_id: string;
  date: string;
  view_count: number;
  unique_viewers: number;
  edit_count: number;
  comment_count: number;
  avg_time_spent_seconds: number;
}

export function usePageActivity(pageId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch recent activity for a page
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['page-activity', pageId],
    queryFn: async () => {
      if (!pageId) return [];

      const { data, error } = await supabase
        .from('page_activity')
        .select(`
          id,
          page_id,
          user_id,
          activity_type,
          activity_data,
          created_at
        `)
        .eq('page_id', pageId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch user profiles for activities
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(a => a.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        return data.map(activity => ({
          ...activity,
          user: activity.user_id ? profileMap.get(activity.user_id) : undefined,
        })) as PageActivity[];
      }

      return data as PageActivity[];
    },
    enabled: !!pageId && !!user,
  });

  // Log an activity
  const logActivity = useMutation({
    mutationFn: async ({
      activityPageId,
      activityType,
      activityData = {}
    }: {
      activityPageId: string;
      activityType: ActivityType;
      activityData?: Record<string, string | number | boolean | null>;
    }) => {
      const { error } = await supabase
        .from('page_activity')
        .insert({
          page_id: activityPageId,
          user_id: user?.id,
          activity_type: activityType,
          activity_data: activityData,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-activity', pageId] });
    },
  });

  return {
    activities,
    isLoading,
    logActivity,
  };
}

export function usePageAnalytics(pageId: string | undefined, days: number = 30) {
  const { user } = useAuth();

  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['page-analytics', pageId, days],
    queryFn: async () => {
      if (!pageId) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('page_analytics')
        .select('*')
        .eq('page_id', pageId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data as PageAnalytics[];
    },
    enabled: !!pageId && !!user,
  });

  // Calculate summary stats
  const summary = {
    totalViews: analytics.reduce((sum, a) => sum + a.view_count, 0),
    totalEdits: analytics.reduce((sum, a) => sum + a.edit_count, 0),
    totalComments: analytics.reduce((sum, a) => sum + a.comment_count, 0),
    uniqueViewers: Math.max(...analytics.map(a => a.unique_viewers), 0),
    avgTimeSpent: analytics.length > 0
      ? Math.round(analytics.reduce((sum, a) => sum + a.avg_time_spent_seconds, 0) / analytics.length)
      : 0,
  };

  return {
    analytics,
    summary,
    isLoading,
  };
}

export function useWorkspaceAnalytics(workspaceId: string | undefined, days: number = 30) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['workspace-analytics', workspaceId, days],
    queryFn: async () => {
      if (!workspaceId) return null;

      // Get all pages in workspace
      const { data: pages, error: pagesError } = await supabase
        .from('workspace_pages')
        .select('id, title, icon_emoji')
        .eq('workspace_id', workspaceId);

      if (pagesError) throw pagesError;

      const pageIds = pages?.map(p => p.id) || [];
      if (pageIds.length === 0) return { pages: [], topPages: [], recentActivity: [] };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get analytics for all pages
      const { data: analytics } = await supabase
        .from('page_analytics')
        .select('*')
        .in('page_id', pageIds)
        .gte('date', startDate.toISOString().split('T')[0]);

      // Get recent activity across workspace
      const { data: recentActivity } = await supabase
        .from('page_activity')
        .select('*')
        .in('page_id', pageIds)
        .order('created_at', { ascending: false })
        .limit(20);

      // Calculate top pages by views
      const pageViewCounts = new Map<string, number>();
      analytics?.forEach(a => {
        const current = pageViewCounts.get(a.page_id) || 0;
        pageViewCounts.set(a.page_id, current + a.view_count);
      });

      const topPages = pages
        ?.map(p => ({
          ...p,
          views: pageViewCounts.get(p.id) || 0,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      return {
        pages,
        topPages,
        recentActivity: recentActivity || [],
        totalViews: analytics?.reduce((sum, a) => sum + (a.view_count ?? 0), 0) || 0,
        totalEdits: analytics?.reduce((sum, a) => sum + (a.edit_count ?? 0), 0) || 0,
      };
    },
    enabled: !!workspaceId && !!user,
  });

  return {
    data,
    isLoading,
  };
}
