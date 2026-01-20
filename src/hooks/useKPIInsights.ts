
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedKPI, DomainHealth } from './useUnifiedKPIs';

export interface KPIInsights {
    summary: string;
    recommendations: {
        text: string;
        priority: 'high' | 'medium' | 'low';
        action?: string;
    }[];
}

export function useKPIInsights(kpis: UnifiedKPI[], domainHealth: DomainHealth[]) {
    return useQuery({
        queryKey: ['kpi-insights', kpis.length], // Simple dependency tracking
        queryFn: async () => {
            // Only fetch if we have data
            if (kpis.length === 0) return null;

            const { data, error } = await supabase.functions.invoke('generate-kpi-insights', {
                body: {
                    kpis: kpis.map(k => ({
                        displayName: k.displayName,
                        value: k.value,
                        status: k.status,
                        criticalThreshold: k.criticalThreshold
                    })), // Minimize payload
                    domainHealth
                }
            });

            if (error) throw error;
            return data as KPIInsights;
        },
        enabled: kpis.length > 0,
        staleTime: 1000 * 60 * 60, // Cache for 1 hour to save costs
        retry: false
    });
}
