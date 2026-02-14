import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { TrendingUp, Users, Clock, Target } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function InviteAnalyticsTab() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: invites } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('created_by_type', 'member');

      if (invites) {
        // Process analytics data
        const total = invites.length;
        const used = invites.filter(i => i.uses_count && i.uses_count > 0).length;
        const revoked = invites.filter(i => !i.is_active).length;
        const pending = total - used - revoked;
        
        const conversionRate = total > 0 ? ((used / total) * 100).toFixed(1) : 0;
        const avgDaysToUse = used > 0
          ? Math.round(
              invites
                .filter(i => i.uses_count && i.uses_count > 0)
                .reduce((sum, i) => {
                  const created = new Date(i.created_at || '').getTime();
                  const updated = new Date(i.updated_at || '').getTime();
                  return sum + (updated - created) / (1000 * 60 * 60 * 24);
                }, 0) / used
            )
          : 0;

        const trendData = [
          { name: 'Used', value: used, color: '#22c55e' },
          { name: 'Pending', value: pending, color: '#f59e0b' },
          { name: 'Revoked', value: revoked, color: '#ef4444' },
        ];

        setAnalytics({
          total,
          used,
          pending,
          revoked,
          conversionRate,
          avgDaysToUse,
          trendData,
          invites,
        });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No invitation data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Invites</p>
              <p className="text-2xl font-bold">{analytics.total}</p>
            </div>
            <Users className="h-8 w-8 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">{analytics.conversionRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-success opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{analytics.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-warning opacity-50" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Days to Accept</p>
              <p className="text-2xl font-bold">{analytics.avgDaysToUse}</p>
            </div>
            <Target className="h-8 w-8 text-muted opacity-50" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Invitation Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics.trendData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.trendData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Summary */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Summary Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Used</span>
              <span className="font-semibold">{analytics.used}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-success h-2 rounded-full transition-all"
                style={{
                  width: `${analytics.total > 0 ? (analytics.used / analytics.total) * 100 : 0}%`,
                }}
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="font-semibold">{analytics.pending}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-warning h-2 rounded-full transition-all"
                style={{
                  width: `${analytics.total > 0 ? (analytics.pending / analytics.total) * 100 : 0}%`,
                }}
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              <span className="text-sm text-muted-foreground">Revoked</span>
              <span className="font-semibold">{analytics.revoked}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-error h-2 rounded-full transition-all"
                style={{
                  width: `${analytics.total > 0 ? (analytics.revoked / analytics.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Insights */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <h3 className="font-semibold mb-2">Key Insights</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {analytics.conversionRate >= 70 ? (
            <li>✓ Strong conversion rate. Keep leveraging team invites!</li>
          ) : analytics.conversionRate >= 50 ? (
            <li>→ Moderate conversion. Consider follow-up on pending invites.</li>
          ) : (
            <li>⚠ Low conversion. Review invite messaging or timing.</li>
          )}
          {analytics.avgDaysToUse < 3 ? (
            <li>✓ Fast adoption. Invitees are engaging quickly.</li>
          ) : (
            <li>→ Typical adoption timeframe of {analytics.avgDaysToUse} days.</li>
          )}
          {analytics.pending > 0 ? (
            <li>→ {analytics.pending} pending invites waiting for acceptance.</li>
          ) : (
            <li>✓ All active invites have been resolved.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
