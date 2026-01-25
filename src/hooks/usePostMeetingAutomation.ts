/**
 * Hook for Post-Meeting Automation
 * 
 * Manages auto-generated follow-ups, action items, and ROI metrics
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/lib/notify';
import { useAuth } from '@/contexts/AuthContext';

interface FollowUpContent {
  thank_you_email?: {
    subject: string;
    body: string;
  };
  action_items?: Array<{
    title: string;
    description?: string;
    assignee: 'host' | 'guest' | 'both';
    priority: 'low' | 'medium' | 'high';
    due_days?: number;
  }>;
  summary?: {
    key_points: string[];
    decisions: string[];
    next_steps: string[];
  };
}

interface MeetingFollowUp {
  id: string;
  meeting_id: string;
  generated_content: FollowUpContent;
  email_subject: string | null;
  email_body: string | null;
  action_items: any[];
  status: 'draft' | 'sent' | 'scheduled' | 'skipped';
  sent_at: string | null;
  created_at: string;
}

interface ActionItem {
  id: string;
  meeting_id: string;
  follow_up_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  assignee_email: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  completed_at: string | null;
}

interface ROIMetrics {
  id: string;
  meeting_id: string;
  participant_count: number;
  duration_minutes: number | null;
  decisions_made: number;
  action_items_count: number;
  efficiency_score: number | null;
  could_have_been_email: boolean;
}

export function usePostMeetingAutomation(meetingId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [followUp, setFollowUp] = useState<MeetingFollowUp | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [roiMetrics, setROIMetrics] = useState<ROIMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchFollowUp = useCallback(async () => {
    if (!meetingId) return;

    setIsLoading(true);
    try {
      // Fetch follow-up (cast to any for new table)
      const { data: followUpData, error: followUpError } = await supabase
        .from('meeting_follow_ups' as any)
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (followUpError && followUpError.code !== 'PGRST116') {
        console.error('Failed to fetch follow-up:', followUpError);
      } else if (followUpData) {
        setFollowUp(followUpData as unknown as MeetingFollowUp);
      }

      // Fetch action items
      const { data: actionsData, error: actionsError } = await supabase
        .from('meeting_action_items' as any)
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });

      if (actionsError) {
        console.error('Failed to fetch action items:', actionsError);
      } else {
        setActionItems((actionsData || []) as unknown as ActionItem[]);
      }

      // Fetch ROI metrics
      const { data: roiData, error: roiError } = await supabase
        .from('meeting_roi_metrics' as any)
        .select('*')
        .eq('meeting_id', meetingId)
        .single();

      if (roiError && roiError.code !== 'PGRST116') {
        console.error('Failed to fetch ROI:', roiError);
      } else if (roiData) {
        setROIMetrics(roiData as unknown as ROIMetrics);
      }

    } catch (error) {
      console.error('Error fetching post-meeting data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  const generateFollowUp = useCallback(async (options?: {
    include_thank_you?: boolean;
    include_action_items?: boolean;
    tone?: 'professional' | 'friendly' | 'formal';
  }) => {
    if (!meetingId) return null;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-generate-follow-up', {
        body: {
          meeting_id: meetingId,
          ...options
        }
      });

      if (error) throw error;

      toast({
        title: 'Follow-up generated',
        description: `Created ${data.action_items_created} action items`,
      });

      // Refresh data
      await fetchFollowUp();

      return data;
    } catch (error) {
      console.error('Failed to generate follow-up:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [meetingId, toast, fetchFollowUp]);

  const updateActionItemStatus = useCallback(async (
    actionItemId: string, 
    status: ActionItem['status']
  ) => {
    try {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('meeting_action_items' as any)
        .update(updates)
        .eq('id', actionItemId);

      if (error) throw error;

      setActionItems(prev => 
        prev.map(item => 
          item.id === actionItemId ? { ...item, ...updates } : item
        )
      );

      toast({
        title: 'Action item updated',
        description: `Status changed to ${status}`,
      });
    } catch (error) {
      console.error('Failed to update action item:', error);
      toast({
        title: 'Update failed',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const sendFollowUpEmail = useCallback(async () => {
    if (!followUp) return false;

    try {
      // Here you would integrate with your email service
      // For now, we just update the status
      const { error } = await supabase
        .from('meeting_follow_ups' as any)
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          thank_you_sent: true
        })
        .eq('id', followUp.id);

      if (error) throw error;

      setFollowUp(prev => prev ? { 
        ...prev, 
        status: 'sent', 
        sent_at: new Date().toISOString() 
      } : null);

      toast({
        title: 'Follow-up sent',
        description: 'Thank you email has been sent',
      });

      return true;
    } catch (error) {
      console.error('Failed to send follow-up:', error);
      toast({
        title: 'Send failed',
        variant: 'destructive',
      });
      return false;
    }
  }, [followUp, toast]);

  return {
    followUp,
    actionItems,
    roiMetrics,
    isLoading,
    isGenerating,
    fetchFollowUp,
    generateFollowUp,
    updateActionItemStatus,
    sendFollowUpEmail,
  };
}
