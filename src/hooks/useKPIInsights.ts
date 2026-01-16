import { useQuery } from '@tanstack/react-query';
import { aiService } from '@/services/aiService';
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
        queryKey: ['kpi-insights', kpis.length],
        queryFn: async () => {
            if (kpis.length === 0) return null;

            const data = await aiService.generateKPIInsights({
                kpis: kpis.map(k => ({
                    name: k.title,
                    value: typeof k.value === 'number' ? k.value : parseFloat(k.value.toString().replace(/[^0-9.-]+/g, '')) || 0,
                    trend: k.trend === 'up' || k.trend === 'down' || k.trend === 'stable' ? k.trend : undefined,
                })),
                domainHealth: 85
            });
            return data as KPIInsights;
        },
        enabled: kpis.length > 0,
        staleTime: 1000 * 60 * 60,
        retry: false
    });
}
