/**
 * Churn Prevention Automation Hook
 * 
 * Connects churn risk detection to automated re-engagement campaigns.
 * Triggers personalized outreach based on user activity patterns.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChurnRiskUser {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  churnRisk: number;
  daysSinceLastActivity: number;
  lastActivityType: string | null;
  reengagementAttempts: number;
}

interface ReengagementCampaign {
  type: 'email' | 'in_app' | 'push';
  templateId: string;
  personalization: Record<string, any>;
}

export function useChurnPrevention() {
  const [loading, setLoading] = useState(false);
  const [atRiskUsers, setAtRiskUsers] = useState<ChurnRiskUser[]>([]);
  const { toast } = useToast();

  // Fetch users at risk of churning
  const fetchAtRiskUsers = useCallback(async (
    riskThreshold: number = 70,
    limit: number = 50
  ) => {
    setLoading(true);
    try {
      // Get users with low activity
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: trackingData, error: trackingError } = await supabase
        .from('user_activity_tracking')
        .select(`
          user_id,
          activity_level,
          last_activity_at,
          last_login_at
        `)
        .or(`activity_level.eq.inactive,activity_level.eq.low,last_activity_at.lt.${thirtyDaysAgo.toISOString()}`)
        .limit(limit);

      if (trackingError) throw trackingError;

      // Get user profiles
      const userIds = trackingData?.map(t => t.user_id) || [];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Get user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Calculate churn risk and compile user data
      const riskUsers: ChurnRiskUser[] = [];

      trackingData?.forEach(tracking => {
        const profile = profiles?.find(p => p.id === tracking.user_id);
        const role = roles?.find(r => r.user_id === tracking.user_id);
        const reengagementCount = 0; // Simplified - would need notification_history table

        if (!profile) return;

        // Calculate churn risk score
        const daysSinceActivity = tracking.last_activity_at
          ? Math.floor((Date.now() - new Date(tracking.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        let churnRisk = 0;
        if (daysSinceActivity > 60) churnRisk = 95;
        else if (daysSinceActivity > 30) churnRisk = 80;
        else if (daysSinceActivity > 14) churnRisk = 60;
        else if (daysSinceActivity > 7) churnRisk = 40;
        else churnRisk = 20;

        // Adjust for activity level
        if (tracking.activity_level === 'inactive') churnRisk += 15;
        else if (tracking.activity_level === 'low') churnRisk += 10;

        churnRisk = Math.min(100, churnRisk);

        if (churnRisk >= riskThreshold) {
          riskUsers.push({
            userId: tracking.user_id,
            email: profile.email || '',
            fullName: profile.full_name || 'Unknown',
            role: role?.role || 'candidate',
            churnRisk,
            daysSinceLastActivity: daysSinceActivity,
            lastActivityType: null,
            reengagementAttempts: reengagementCount,
          });
        }
      });

      // Sort by churn risk (highest first)
      riskUsers.sort((a, b) => b.churnRisk - a.churnRisk);
      setAtRiskUsers(riskUsers);

      return riskUsers;
    } catch (error) {
      console.error('Error fetching at-risk users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch at-risk users',
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Trigger re-engagement campaign
  const triggerReengagement = useCallback(async (
    userId: string,
    campaign: ReengagementCampaign
  ) => {
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (!profile?.email) {
        throw new Error('User email not found');
      }

      // Choose template based on campaign type
      let templateName = 'reengagement_generic';
      
      if (campaign.templateId) {
        templateName = campaign.templateId;
      }

      // Invoke email function
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: profile.email,
          subject: campaign.personalization.subject || 'We miss you at The Quantum Club!',
          template_name: templateName,
          template_data: {
            user_name: profile.full_name,
            ...campaign.personalization,
          },
          notification_type: 'reengagement',
          user_id: userId,
        },
      });

      if (error) throw error;

      // Log the re-engagement attempt in activity feed
      await (supabase as any).from('activity_feed').insert({
        user_id: userId,
        event_type: 'reengagement_sent',
        event_data: { template: templateName, channel: campaign.type },
        visibility: 'admin',
      });

      toast({
        title: 'Re-engagement sent',
        description: `Successfully sent ${campaign.type} to ${profile.full_name}`,
      });

      return true;
    } catch (error) {
      console.error('Error triggering re-engagement:', error);
      toast({
        title: 'Error',
        description: 'Failed to send re-engagement',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Bulk re-engagement for multiple users
  const triggerBulkReengagement = useCallback(async (
    users: ChurnRiskUser[],
    campaignType: 'email' | 'in_app' | 'push' = 'email'
  ) => {
    setLoading(true);
    let successCount = 0;

    for (const user of users) {
      // Skip users with too many re-engagement attempts
      if (user.reengagementAttempts >= 3) continue;

      // Personalize based on user role and activity
      const personalization = getPersonalizedContent(user);

      const success = await triggerReengagement(user.userId, {
        type: campaignType,
        templateId: personalization.templateId,
        personalization: personalization.data,
      });

      if (success) successCount++;

      // Rate limiting - wait between sends
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast({
      title: 'Bulk re-engagement complete',
      description: `Sent ${successCount} of ${users.length} messages`,
    });

    setLoading(false);
    return successCount;
  }, [triggerReengagement, toast]);

  return {
    loading,
    atRiskUsers,
    fetchAtRiskUsers,
    triggerReengagement,
    triggerBulkReengagement,
  };
}

// Get personalized content based on user profile
function getPersonalizedContent(user: ChurnRiskUser): {
  templateId: string;
  data: Record<string, any>;
} {
  // Candidate-specific messaging
  if (user.role === 'candidate') {
    if (user.daysSinceLastActivity > 30) {
      return {
        templateId: 'reengagement_candidate_dormant',
        data: {
          subject: `${user.fullName}, new opportunities are waiting for you`,
          headline: 'Your next career move is just a click away',
          cta_text: 'Explore New Jobs',
          cta_url: '/jobs',
        },
      };
    }
    return {
      templateId: 'reengagement_candidate_gentle',
      data: {
        subject: `Quick update for ${user.fullName}`,
        headline: "Here's what you've missed",
        cta_text: 'Check Your Dashboard',
        cta_url: '/home',
      },
    };
  }

  // Partner-specific messaging
  if (user.role === 'partner') {
    return {
      templateId: 'reengagement_partner',
      data: {
        subject: `${user.fullName}, your hiring pipeline needs attention`,
        headline: 'Top candidates are waiting',
        cta_text: 'Review Candidates',
        cta_url: '/applications',
      },
    };
  }

  // Generic fallback
  return {
    templateId: 'reengagement_generic',
    data: {
      subject: `We miss you at The Quantum Club, ${user.fullName}!`,
      headline: 'Come back and see what\'s new',
      cta_text: 'Return to Platform',
      cta_url: '/home',
    },
  };
}
