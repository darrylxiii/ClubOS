
import { useMutation } from '@tanstack/react-query';
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

export function useKPIInsights() {
    return useMutation({
        mutationFn: async ({ kpis, domainHealth }: { kpis: UnifiedKPI[]; domainHealth: DomainHealth[] }) => {
            if (kpis.length === 0) return null;

            const { data, error } = await supabase.functions.invoke('generate-kpi-insights', {
                body: {
                    kpis: kpis.map(k => ({
                        displayName: k.displayName,
                        value: k.value,
                        status: k.status,
                        criticalThreshold: k.criticalThreshold
                    })),
                    domainHealth
                }
            });

            if (error) throw error;
            return data as KPIInsights;
        },
    });
}
