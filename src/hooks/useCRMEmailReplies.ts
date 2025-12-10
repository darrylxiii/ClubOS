import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CRMEmailReply, ReplyClassification } from '@/types/crm-enterprise';

interface UseEmailRepliesOptions {
  classification?: ReplyClassification | ReplyClassification[];
  isRead?: boolean;
  isActioned?: boolean;
  prospectId?: string;
  campaignId?: string;
  limit?: number;
  search?: string;
}

export function useCRMEmailReplies(options: UseEmailRepliesOptions = {}) {
  const [replies, setReplies] = useState<CRMEmailReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchReplies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('crm_email_replies')
        .select(`
          *,
          prospect:crm_prospects!crm_email_replies_prospect_id_fkey(full_name, company_name),
          campaign:crm_campaigns!crm_email_replies_campaign_id_fkey(name)
        `)
        .eq('is_archived', false)
        .eq('is_spam', false)
        .order('received_at', { ascending: false });

      if (options.classification) {
        if (Array.isArray(options.classification)) {
          query = query.in('classification', options.classification);
        } else {
          query = query.eq('classification', options.classification);
        }
      }

      if (options.isRead !== undefined) {
        query = query.eq('is_read', options.isRead);
      }

      if (options.isActioned !== undefined) {
        query = query.eq('is_actioned', options.isActioned);
      }

      if (options.prospectId) {
        query = query.eq('prospect_id', options.prospectId);
      }

      if (options.campaignId) {
        query = query.eq('campaign_id', options.campaignId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.search) {
        query = query.or(`subject.ilike.%${options.search}%,body_text.ilike.%${options.search}%,from_email.ilike.%${options.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const mappedReplies: CRMEmailReply[] = (data || []).map((r: any) => ({
        ...r,
        prospect_name: r.prospect?.full_name,
        prospect_company: r.prospect?.company_name,
        campaign_name: r.campaign?.name,
      }));

      setReplies(mappedReplies);
    } catch (err) {
      console.error('Error fetching email replies:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [options.classification, options.isRead, options.isActioned, options.prospectId, options.campaignId, options.limit, options.search]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  const markAsRead = async (replyId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('crm_email_replies')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyId);

      if (updateError) throw updateError;

      setReplies(prev => 
        prev.map(r => r.id === replyId ? { ...r, is_read: true } : r)
      );

      return true;
    } catch (err) {
      console.error('Error marking reply as read:', err);
      return false;
    }
  };

  const markAsActioned = async (replyId: string, action: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from('crm_email_replies')
        .update({ 
          is_actioned: true,
          actioned_at: new Date().toISOString(),
          actioned_by: user?.id,
          action_taken: action,
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyId);

      if (updateError) throw updateError;

      setReplies(prev => 
        prev.map(r => r.id === replyId ? { 
          ...r, 
          is_actioned: true, 
          action_taken: action,
          actioned_at: new Date().toISOString(),
        } : r)
      );

      toast({
        title: 'Reply actioned',
        description: `Marked as: ${action}`,
      });

      return true;
    } catch (err) {
      console.error('Error marking reply as actioned:', err);
      toast({
        title: 'Error',
        description: 'Failed to action reply',
        variant: 'destructive',
      });
      return false;
    }
  };

  const archiveReply = async (replyId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('crm_email_replies')
        .update({ 
          is_archived: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyId);

      if (updateError) throw updateError;

      setReplies(prev => prev.filter(r => r.id !== replyId));

      toast({
        title: 'Reply archived',
        description: 'The reply has been archived',
      });

      return true;
    } catch (err) {
      console.error('Error archiving reply:', err);
      toast({
        title: 'Error',
        description: 'Failed to archive reply',
        variant: 'destructive',
      });
      return false;
    }
  };

  const markAsSpam = async (replyId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('crm_email_replies')
        .update({ 
          is_spam: true,
          classification: 'spam',
          updated_at: new Date().toISOString(),
        })
        .eq('id', replyId);

      if (updateError) throw updateError;

      setReplies(prev => prev.filter(r => r.id !== replyId));

      toast({
        title: 'Marked as spam',
        description: 'The reply has been marked as spam',
      });

      return true;
    } catch (err) {
      console.error('Error marking as spam:', err);
      toast({
        title: 'Error',
        description: 'Failed to mark as spam',
        variant: 'destructive',
      });
      return false;
    }
  };

  const analyzeReply = async (replyId: string) => {
    try {
      const reply = replies.find(r => r.id === replyId);
      if (!reply) throw new Error('Reply not found');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('analyze-email-reply', {
        body: {
          reply_id: replyId,
          prospect_id: reply.prospect_id,
          from_email: reply.from_email,
          from_name: reply.from_name,
          subject: reply.subject,
          body_text: reply.body_text,
        },
      });

      if (response.error) throw response.error;

      // Refetch to get updated data
      await fetchReplies();

      toast({
        title: 'Analysis complete',
        description: `Classified as: ${response.data.analysis.classification}`,
      });

      return response.data.analysis;
    } catch (err) {
      console.error('Error analyzing reply:', err);
      toast({
        title: 'Error',
        description: 'Failed to analyze reply',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Count by classification
  const getCounts = () => {
    const counts: Record<string, number> = {
      all: replies.length,
      unread: replies.filter(r => !r.is_read).length,
      hot: replies.filter(r => r.classification === 'hot_lead').length,
      warm: replies.filter(r => ['warm_lead', 'interested'].includes(r.classification)).length,
      objection: replies.filter(r => r.classification === 'objection').length,
      negative: replies.filter(r => ['not_interested', 'unsubscribe'].includes(r.classification)).length,
      other: replies.filter(r => ['out_of_office', 'auto_reply', 'question', 'referral'].includes(r.classification)).length,
    };
    return counts;
  };

  return {
    replies,
    loading,
    error,
    refetch: fetchReplies,
    markAsRead,
    markAsActioned,
    archiveReply,
    markAsSpam,
    analyzeReply,
    getCounts,
  };
}
