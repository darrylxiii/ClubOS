import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedCommunication {
  id: string;
  entity_type: string;
  entity_id: string;
  channel: string;
  source_table: string;
  source_id: string;
  direction: string;
  subject: string | null;
  content_preview: string | null;
  sentiment_score: number | null;
  original_timestamp: string;
  sender_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface IntelligenceQueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  processing_type: string;
  priority: number;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface CommunicationStats {
  totalUnified: number;
  byChannel: Record<string, number>;
  byDirection: Record<string, number>;
  pendingEmbeddings: number;
  processedEmbeddings: number;
  avgSentiment: number | null;
}

export function useCommunicationAudit() {
  const queryClient = useQueryClient();

  // Get unified communications stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['communication-audit-stats'],
    queryFn: async (): Promise<CommunicationStats> => {
      // Get total count
      const { count: totalUnified } = await supabase
        .from('unified_communications')
        .select('*', { count: 'exact', head: true });

      // Get by channel
      const { data: channelData } = await supabase
        .from('unified_communications')
        .select('channel');
      
      const byChannel: Record<string, number> = {};
      channelData?.forEach(row => {
        byChannel[row.channel] = (byChannel[row.channel] || 0) + 1;
      });

      // Get by direction
      const { data: directionData } = await supabase
        .from('unified_communications')
        .select('direction');
      
      const byDirection: Record<string, number> = {};
      directionData?.forEach(row => {
        byDirection[row.direction] = (byDirection[row.direction] || 0) + 1;
      });

      // Get queue stats
      const { count: pendingEmbeddings } = await supabase
        .from('intelligence_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('processing_type', 'generate_embedding');

      const { count: processedEmbeddings } = await supabase
        .from('intelligence_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', 'communication');

      // Get average sentiment
      const { data: sentimentData } = await supabase
        .from('unified_communications')
        .select('sentiment_score')
        .not('sentiment_score', 'is', null);
      
      let avgSentiment: number | null = null;
      if (sentimentData && sentimentData.length > 0) {
        const sum = sentimentData.reduce((acc, row) => acc + (row.sentiment_score || 0), 0);
        avgSentiment = sum / sentimentData.length;
      }

      return {
        totalUnified: totalUnified || 0,
        byChannel,
        byDirection,
        pendingEmbeddings: pendingEmbeddings || 0,
        processedEmbeddings: processedEmbeddings || 0,
        avgSentiment,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get recent unified communications
  const { data: recentCommunications, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-unified-communications'],
    queryFn: async (): Promise<UnifiedCommunication[]> => {
      const { data, error } = await supabase
        .from('unified_communications')
        .select('*')
        .order('original_timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  // Get queue status
  const { data: queueStatus, isLoading: queueLoading } = useQuery({
    queryKey: ['intelligence-queue-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intelligence_queue')
        .select('status, processing_type')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const statusCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};

      data?.forEach(item => {
        const status = item.status ?? 'unknown';
        const processingType = item.processing_type ?? 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        typeCounts[processingType] = (typeCounts[processingType] || 0) + 1;
      });

      return { statusCounts, typeCounts, total: data?.length || 0 };
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Trigger backfill mutation
  const triggerBackfill = useMutation({
    mutationFn: async (options?: { table?: string; batchSize?: number }) => {
      const { data, error } = await supabase.functions.invoke('backfill-unified-communications', {
        body: options || {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-audit-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-unified-communications'] });
      queryClient.invalidateQueries({ queryKey: ['intelligence-queue-status'] });
    },
  });

  // Process queue mutation
  const processQueue = useMutation({
    mutationFn: async (batchSize?: number) => {
      const size = batchSize ?? 25;
      const { data, error } = await supabase.functions.invoke('process-intelligence-queue', {
        body: { batch_size: size },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intelligence-queue-status'] });
      queryClient.invalidateQueries({ queryKey: ['communication-audit-stats'] });
    },
  });

  return {
    stats,
    statsLoading,
    recentCommunications,
    recentLoading,
    queueStatus,
    queueLoading,
    triggerBackfill,
    processQueue,
    isLoading: statsLoading || recentLoading || queueLoading,
  };
}

// Hook to get communications for a specific entity
export function useEntityCommunications(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['entity-communications', entityType, entityId],
    queryFn: async (): Promise<UnifiedCommunication[]> => {
      const { data, error } = await supabase
        .from('unified_communications')
        .select('*')
        .eq('entity_type', entityType as 'candidate' | 'company' | 'partner' | 'prospect' | 'stakeholder')
        .eq('entity_id', entityId)
        .order('original_timestamp', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as UnifiedCommunication[];
    },
    enabled: !!entityType && !!entityId,
  });
}

// Hook to search communications
export function useSearchCommunications(searchQuery: string, filters?: {
  channel?: string[];
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['search-communications', searchQuery, filters],
    queryFn: async (): Promise<UnifiedCommunication[]> => {
      let query = supabase
        .from('unified_communications')
        .select('*')
        .order('original_timestamp', { ascending: false })
        .limit(100);

      if (searchQuery) {
        query = query.or(`subject.ilike.%${searchQuery}%,content_preview.ilike.%${searchQuery}%`);
      }

      if (filters?.channel && filters.channel.length > 0) {
        query = query.in('channel', filters.channel as ('email' | 'in_person' | 'linkedin' | 'meeting' | 'other' | 'phone' | 'whatsapp')[]);
      }

      if (filters?.direction) {
        query = query.eq('direction', filters.direction as 'inbound' | 'outbound' | 'mutual');
      }

      if (filters?.dateFrom) {
        query = query.gte('original_timestamp', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('original_timestamp', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as UnifiedCommunication[];
    },
    enabled: searchQuery.length > 0 || (filters !== undefined && Object.keys(filters).length > 0),
  });
}
