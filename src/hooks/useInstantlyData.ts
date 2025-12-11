import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
  external_id: string | null;
  leads_count: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  total_bounced: number;
  total_unsubscribed: number;
  total_opportunities: number;
  total_interested: number;
  total_meeting_booked: number;
  total_meeting_completed: number;
  total_closed: number;
  contacted_count: number;
  completed_count: number;
  new_leads_contacted: number;
  last_synced_at: string | null;
  sync_status: string | null;
  created_at: string;
}

export interface InstantlyLead {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  stage: string;
  lead_score: number | null;
  instantly_lead_id: string | null;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  last_replied_at: string | null;
  bounced_at: string | null;
  is_interested: boolean | null;
  campaign_id: string | null;
  created_at: string;
}

export interface InstantlyStats {
  totalCampaigns: number;
  activeCampaigns: number;
  pausedCampaigns: number;
  completedCampaigns: number;
  totalLeads: number;
  totalContacted: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalBounced: number;
  totalOpportunities: number;
  totalInterested: number;
  totalMeetingBooked: number;
  totalMeetingCompleted: number;
  totalClosed: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
  interestRate: number;
}

export interface SyncLog {
  id: string;
  sync_type: string;
  synced_records: number | null;
  failed_records: number | null;
  errors: any;
  created_at: string | null;
}

export function useInstantlyData() {
  const [campaigns, setCampaigns] = useState<InstantlyCampaign[]>([]);
  const [leads, setLeads] = useState<InstantlyLead[]>([]);
  const [stats, setStats] = useState<InstantlyStats | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async (): Promise<InstantlyCampaign[]> => {
    const { data, error } = await supabase
      .from('crm_campaigns')
      .select('id, name, status, external_id, leads_count, total_sent, total_opened, total_clicked, total_replied, total_bounced, total_unsubscribed, total_opportunities, total_interested, total_meeting_booked, total_meeting_completed, total_closed, contacted_count, completed_count, new_leads_contacted, last_synced_at, sync_status, created_at')
      .not('external_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
    return (data || []).map(c => ({
      ...c,
      total_opportunities: (c as any).total_opportunities || 0,
      total_interested: (c as any).total_interested || 0,
      total_meeting_booked: (c as any).total_meeting_booked || 0,
      total_meeting_completed: (c as any).total_meeting_completed || 0,
      total_closed: (c as any).total_closed || 0,
      contacted_count: (c as any).contacted_count || 0,
      completed_count: (c as any).completed_count || 0,
      new_leads_contacted: (c as any).new_leads_contacted || 0,
    })) as InstantlyCampaign[];
  }, []);

  const fetchLeads = useCallback(async (campaignId?: string): Promise<InstantlyLead[]> => {
    let query = supabase
      .from('crm_prospects')
      .select('id, email, first_name, last_name, company_name, stage, lead_score, instantly_lead_id, last_opened_at, last_clicked_at, last_replied_at, bounced_at, is_interested, campaign_id, created_at')
      .not('instantly_lead_id', 'is', null)
      .order('created_at', { ascending: false });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query.limit(500);

    if (error) {
      console.error('Error fetching leads:', error);
      return [];
    }
    return (data || []) as InstantlyLead[];
  }, []);

  const fetchSyncLogs = useCallback(async (): Promise<SyncLog[]> => {
    const { data, error } = await supabase
      .from('crm_sync_logs')
      .select('id, sync_type, synced_records, failed_records, errors, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching sync logs:', error);
      return [];
    }
    return (data || []) as SyncLog[];
  }, []);

  const calculateStats = useCallback((campaignsData: InstantlyCampaign[]): InstantlyStats => {
    const totalSent = campaignsData.reduce((sum, c) => sum + (c.total_sent || 0), 0);
    const totalOpened = campaignsData.reduce((sum, c) => sum + (c.total_opened || 0), 0);
    const totalClicked = campaignsData.reduce((sum, c) => sum + (c.total_clicked || 0), 0);
    const totalReplied = campaignsData.reduce((sum, c) => sum + (c.total_replied || 0), 0);
    const totalBounced = campaignsData.reduce((sum, c) => sum + (c.total_bounced || 0), 0);
    const totalLeads = campaignsData.reduce((sum, c) => sum + (c.leads_count || 0), 0);
    const totalOpportunities = campaignsData.reduce((sum, c) => sum + (c.total_opportunities || 0), 0);
    const totalContacted = campaignsData.reduce((sum, c) => sum + (c.contacted_count || 0), 0);
    const totalInterested = campaignsData.reduce((sum, c) => sum + (c.total_interested || 0), 0);
    const totalMeetingBooked = campaignsData.reduce((sum, c) => sum + (c.total_meeting_booked || 0), 0);
    const totalMeetingCompleted = campaignsData.reduce((sum, c) => sum + (c.total_meeting_completed || 0), 0);
    const totalClosed = campaignsData.reduce((sum, c) => sum + (c.total_closed || 0), 0);

    return {
      totalCampaigns: campaignsData.length,
      activeCampaigns: campaignsData.filter(c => c.status === 'active').length,
      pausedCampaigns: campaignsData.filter(c => c.status === 'paused').length,
      completedCampaigns: campaignsData.filter(c => c.status === 'completed').length,
      totalLeads,
      totalContacted,
      totalSent,
      totalOpened,
      totalClicked,
      totalReplied,
      totalBounced,
      totalOpportunities,
      totalInterested,
      totalMeetingBooked,
      totalMeetingCompleted,
      totalClosed,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
      replyRate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      interestRate: totalContacted > 0 ? (totalOpportunities / totalContacted) * 100 : 0,
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsData, leadsData, logsData] = await Promise.all([
        fetchCampaigns(),
        fetchLeads(),
        fetchSyncLogs(),
      ]);

      setCampaigns(campaignsData);
      setLeads(leadsData);
      setSyncLogs(logsData);
      setStats(calculateStats(campaignsData));

      // Get last sync time
      const lastSync = logsData.find(log => (log.failed_records || 0) === 0 && (log.synced_records || 0) > 0);
      if (lastSync && lastSync.created_at) {
        setLastSyncedAt(lastSync.created_at);
      }
    } catch (error) {
      console.error('Error loading Instantly data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCampaigns, fetchLeads, fetchSyncLogs, calculateStats]);

  const syncCampaigns = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-instantly-campaigns');
      
      if (error) throw error;
      
      toast.success(`Synced ${data?.created + data?.updated || 0} campaigns from Instantly`);
      await loadData();
    } catch (error: any) {
      console.error('Error syncing campaigns:', error);
      toast.error(error.message || 'Failed to sync campaigns');
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  const syncLeads = useCallback(async (campaignId?: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-instantly-leads', {
        body: campaignId ? { campaignId } : undefined,
      });
      
      if (error) throw error;
      
      toast.success(`Synced ${data?.synced || 0} leads from Instantly`);
      await loadData();
    } catch (error: any) {
      console.error('Error syncing leads:', error);
      toast.error(error.message || 'Failed to sync leads');
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  const syncAll = useCallback(async () => {
    setSyncing(true);
    try {
      await syncCampaigns();
      await syncLeads();
    } finally {
      setSyncing(false);
    }
  }, [syncCampaigns, syncLeads]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    campaigns,
    leads,
    stats,
    syncLogs,
    loading,
    syncing,
    lastSyncedAt,
    syncCampaigns,
    syncLeads,
    syncAll,
    refetch: loadData,
  };
}