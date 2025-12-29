import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";

interface CohortData {
  cohort: string;
  month0: number;
  month1: number;
  month2: number;
  month3: number;
  month6: number;
  month12: number;
}

export function CohortAnalysis() {
  const { data: cohortData, isLoading } = useQuery({
    queryKey: ['cohort-retention'],
    queryFn: async () => {
      // Get all subscriptions with their creation dates
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('id, user_id, status, created_at, canceled_at')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!subscriptions || subscriptions.length === 0) return [];

      // Group subscriptions by cohort month
      const cohorts: Record<string, { 
        total: number; 
        retainedByMonth: Record<number, number>;
      }> = {};

      const now = new Date();

      subscriptions.forEach((sub: any) => {
        const createdDate = new Date(sub.created_at);
        const cohortKey = format(startOfMonth(createdDate), 'MMM yyyy');

        if (!cohorts[cohortKey]) {
          cohorts[cohortKey] = { total: 0, retainedByMonth: {} };
        }
        cohorts[cohortKey].total++;

        // Calculate retention for each month
        const monthsSinceCreation = Math.floor(
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        for (let m = 0; m <= Math.min(monthsSinceCreation, 12); m++) {
          const checkDate = new Date(createdDate);
          checkDate.setMonth(checkDate.getMonth() + m);

          // Check if subscription was still active at this point
          const wasActive = sub.status === 'active' || 
            (sub.canceled_at && new Date(sub.canceled_at) > checkDate);

          if (wasActive || m === 0) {
            cohorts[cohortKey].retainedByMonth[m] = 
              (cohorts[cohortKey].retainedByMonth[m] || 0) + 1;
          }
        }
      });

      // Convert to array format for display (last 6 cohorts)
      const cohortArray: CohortData[] = Object.entries(cohorts)
        .slice(-6)
        .map(([cohort, data]) => ({
          cohort,
          month0: data.total > 0 ? Math.round((data.retainedByMonth[0] || 0) / data.total * 100) : 0,
          month1: data.total > 0 ? Math.round((data.retainedByMonth[1] || 0) / data.total * 100) : 0,
          month2: data.total > 0 ? Math.round((data.retainedByMonth[2] || 0) / data.total * 100) : 0,
          month3: data.total > 0 ? Math.round((data.retainedByMonth[3] || 0) / data.total * 100) : 0,
          month6: data.total > 0 ? Math.round((data.retainedByMonth[6] || 0) / data.total * 100) : 0,
          month12: data.total > 0 ? Math.round((data.retainedByMonth[12] || 0) / data.total * 100) : 0,
        }));

      return cohortArray;
    },
  });

  const getRetentionColor = (value: number) => {
    if (value >= 80) return 'bg-green-500/80 text-white';
    if (value >= 60) return 'bg-green-500/50';
    if (value >= 40) return 'bg-amber-500/50';
    if (value >= 20) return 'bg-amber-500/30';
    if (value > 0) return 'bg-red-500/30';
    return 'bg-muted';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Cohort Retention
        </CardTitle>
        <CardDescription>Customer retention by signup month</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !cohortData || cohortData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No cohort data available yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Cohort</th>
                  <th className="text-center py-2 px-2 font-medium">M0</th>
                  <th className="text-center py-2 px-2 font-medium">M1</th>
                  <th className="text-center py-2 px-2 font-medium">M2</th>
                  <th className="text-center py-2 px-2 font-medium">M3</th>
                  <th className="text-center py-2 px-2 font-medium">M6</th>
                  <th className="text-center py-2 px-2 font-medium">M12</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((row) => (
                  <tr key={row.cohort} className="border-b last:border-0">
                    <td className="py-2 px-2 font-medium">{row.cohort}</td>
                    <td className="py-2 px-2">
                      <div className={`text-center rounded py-1 px-2 ${getRetentionColor(row.month0)}`}>
                        {row.month0}%
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className={`text-center rounded py-1 px-2 ${getRetentionColor(row.month1)}`}>
                        {row.month1 > 0 ? `${row.month1}%` : '-'}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className={`text-center rounded py-1 px-2 ${getRetentionColor(row.month2)}`}>
                        {row.month2 > 0 ? `${row.month2}%` : '-'}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className={`text-center rounded py-1 px-2 ${getRetentionColor(row.month3)}`}>
                        {row.month3 > 0 ? `${row.month3}%` : '-'}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className={`text-center rounded py-1 px-2 ${getRetentionColor(row.month6)}`}>
                        {row.month6 > 0 ? `${row.month6}%` : '-'}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className={`text-center rounded py-1 px-2 ${getRetentionColor(row.month12)}`}>
                        {row.month12 > 0 ? `${row.month12}%` : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
