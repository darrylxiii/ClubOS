import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KPILineageMetadata {
  id: string;
  kpi_name: string;
  source_tables: string[];
  source_apis: string[];
  transformations: {
    name: string;
    description?: string;
    order?: number;
  }[];
  refresh_rate: string;
  dependencies: string[];
  consumers: string[];
  owner_id: string | null;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useKPILineageMetadata(kpiName?: string) {
  return useQuery({
    queryKey: ['kpi-lineage-metadata', kpiName],
    queryFn: async () => {
      let query = supabase
        .from('kpi_lineage_metadata')
        .select('*')
        .order('kpi_name');

      if (kpiName) {
        query = query.eq('kpi_name', kpiName);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Parse transformations from JSONB
      return (data || []).map(item => ({
        ...item,
        transformations: Array.isArray(item.transformations) 
          ? item.transformations 
          : []
      })) as KPILineageMetadata[];
    }
  });
}

export function useKPILineageForKPI(kpiName: string) {
  return useQuery({
    queryKey: ['kpi-lineage-single', kpiName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_lineage_metadata')
        .select('*')
        .eq('kpi_name', kpiName)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      return {
        ...data,
        transformations: Array.isArray(data.transformations) 
          ? data.transformations 
          : []
      } as KPILineageMetadata;
    },
    enabled: !!kpiName
  });
}

export function useUpdateKPILineage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineage: Partial<KPILineageMetadata> & { kpi_name: string }) => {
      const { kpi_name, ...updates } = lineage;
      
      const { data: existing } = await supabase
        .from('kpi_lineage_metadata')
        .select('id')
        .eq('kpi_name', kpi_name)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('kpi_lineage_metadata')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('kpi_name', kpi_name);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kpi_lineage_metadata')
          .insert({ kpi_name, ...updates });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-lineage-metadata'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-lineage-single'] });
    }
  });
}

// Helper to generate default lineage for KPIs without metadata
export function generateDefaultLineage(kpiName: string, domain: string): Partial<KPILineageMetadata> {
  const domainDefaults: Record<string, Partial<KPILineageMetadata>> = {
    'operations': {
      source_tables: ['candidates', 'applications'],
      refresh_rate: 'Real-time',
      consumers: ['Executive Dashboard', 'Operations Report']
    },
    'sales': {
      source_tables: ['invoices', 'contracts'],
      source_apis: ['Stripe API'],
      refresh_rate: 'Hourly',
      consumers: ['Sales Dashboard', 'Revenue Report']
    },
    'platform': {
      source_tables: ['jobs', 'companies'],
      source_apis: ['Greenhouse Sync'],
      refresh_rate: 'Every 15 min',
      consumers: ['Platform Dashboard', 'Client Report']
    },
    'growth': {
      source_tables: ['placements', 'referrals'],
      refresh_rate: 'Daily',
      consumers: ['Growth Dashboard', 'Board Report']
    },
    'website': {
      source_apis: ['Google Analytics'],
      refresh_rate: 'Hourly',
      consumers: ['Marketing Dashboard', 'SEO Report']
    },
    'intelligence': {
      source_tables: ['ai_session_scores', 'ai_conversations'],
      refresh_rate: 'Real-time',
      consumers: ['AI Dashboard', 'QUIN Analytics']
    },
    'costs': {
      source_tables: ['invoices', 'expenses'],
      source_apis: ['Moneybird API'],
      refresh_rate: 'Daily',
      consumers: ['Finance Dashboard', 'Cost Report']
    }
  };

  return {
    kpi_name: kpiName,
    source_tables: [],
    source_apis: [],
    transformations: [
      { name: 'Aggregate by time period', order: 1 },
      { name: 'Apply status filters', order: 2 },
      { name: 'Calculate metrics', order: 3 }
    ],
    dependencies: ['User Permissions'],
    ...domainDefaults[domain]
  };
}
