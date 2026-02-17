import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { untypedTable } from "@/lib/supabaseRpc";
import { Skeleton } from "@/components/ui/skeleton";

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired'] as const;

function useOperationalEfficiency() {
  return useQuery({
    queryKey: ['operational-efficiency'],
    queryFn: async () => {
      const [appsRes, hiresRes] = await Promise.all([
        untypedTable('applications').select('status, created_at, stage_updated_at, job_id'),
        untypedTable('continuous_pipeline_hires').select('company_id'),
      ]);

      const apps = appsRes.data || [];
      const hires = hiresRes.data || [];

      // Avg days in stage (approximation from created_at to stage_updated_at by status)
      const stageDwell: Record<string, { total: number; count: number }> = {};
      STAGES.forEach(s => { stageDwell[s] = { total: 0, count: 0 }; });

      apps.forEach((a: any) => {
        if (a.stage_updated_at && a.status && stageDwell[a.status]) {
          const days = (new Date(a.stage_updated_at).getTime() - new Date(a.created_at).getTime()) / 86400000;
          if (days >= 0 && days < 365) {
            stageDwell[a.status].total += days;
            stageDwell[a.status].count += 1;
          }
        }
      });

      const stageAvgs = STAGES.map(s => ({
        stage: s,
        avgDays: stageDwell[s].count > 0 ? Math.round((stageDwell[s].total / stageDwell[s].count) * 10) / 10 : 0,
      }));

      const bottleneck = stageAvgs.reduce((max, s) => s.avgDays > max.avgDays ? s : max, stageAvgs[0]);

      // Repeat placement rate
      const companyHires: Record<string, number> = {};
      hires.forEach((h: any) => {
        if (h.company_id) companyHires[h.company_id] = (companyHires[h.company_id] || 0) + 1;
      });
      const companiesWithHires = Object.keys(companyHires).length;
      const repeatCompanies = Object.values(companyHires).filter(c => c >= 2).length;
      const repeatRate = companiesWithHires > 0 ? Math.round((repeatCompanies / companiesWithHires) * 100) : null;

      return { stageAvgs, bottleneck, repeatRate };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export const OperationalEfficiencyWidget = () => {
  const { data, isLoading } = useOperationalEfficiency();

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Operational Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const maxDays = Math.max(...data.stageAvgs.map(s => s.avgDays), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.25 }}
    >
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Operational Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stage dwell bars */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg Days in Stage</p>
            {data.stageAvgs.map((s) => (
              <div key={s.stage} className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground w-16 capitalize truncate">{s.stage}</span>
                <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.stage === data.bottleneck.stage ? 'bg-amber-500' : 'bg-primary/60'
                    }`}
                    style={{ width: `${Math.max((s.avgDays / maxDays) * 100, 4)}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium w-8 text-right">{s.avgDays}d</span>
              </div>
            ))}
          </div>

          {/* Bottleneck */}
          {data.bottleneck.avgDays > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="text-[11px]">
                Bottleneck: <span className="font-medium capitalize">{data.bottleneck.stage}</span> ({data.bottleneck.avgDays}d avg)
              </span>
            </div>
          )}

          {/* Repeat rate */}
          <div className="flex items-center justify-between pt-1 border-t border-border/20">
            <span className="text-[11px] text-muted-foreground">Repeat Placement Rate</span>
            <span className={`text-sm font-bold ${
              data.repeatRate !== null && data.repeatRate >= 30 ? 'text-emerald-500' : 'text-muted-foreground'
            }`}>
              {data.repeatRate !== null ? `${data.repeatRate}%` : '--'}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
