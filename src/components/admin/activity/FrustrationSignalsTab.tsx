import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, MousePointer, XCircle, AlertCircle, Wifi } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function FrustrationSignalsTab() {
  const { data: frustrationData } = useQuery({
    queryKey: ['frustration-signals'],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      
      const { data: signals } = await supabase
        .from('user_frustration_signals')
        .select('*')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      const signalsByType = (signals || []).reduce((acc: any, signal: any) => {
        const type = signal.signal_type;
        if (!acc[type]) {
          acc[type] = { type, count: 0, pages: new Set() };
        }
        acc[type].count += signal.count || 1;
        acc[type].pages.add(signal.page_path);
        return acc;
      }, {});

      const signalsByPage = (signals || []).reduce((acc: any, signal: any) => {
        const page = signal.page_path;
        if (!acc[page]) {
          acc[page] = { page, total: 0, types: {} };
        }
        acc[page].total += signal.count || 1;
        acc[page].types[signal.signal_type] = (acc[page].types[signal.signal_type] || 0) + (signal.count || 1);
        return acc;
      }, {});

      return {
        recentSignals: signals || [],
        signalsByType: Object.values(signalsByType).map((s: any) => ({
          ...s,
          pages: s.pages.size
        })),
        problemPages: Object.values(signalsByPage).sort((a: any, b: any) => b.total - a.total).slice(0, 10)
      };
    },
    refetchInterval: 30000
  });

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'rage_click': return <MousePointer className="h-4 w-4 text-red-500" />;
      case 'dead_click': return <XCircle className="h-4 w-4 text-orange-500" />;
      case 'error_encountered': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'slow_network': return <Wifi className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSignalBadgeVariant = (type: string) => {
    switch (type) {
      case 'rage_click':
      case 'error_encountered':
        return 'destructive';
      case 'dead_click':
      case 'slow_network':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {frustrationData?.signalsByType?.slice(0, 4).map((signal: any) => (
          <Card key={signal.type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {signal.type.replace('_', ' ')}
              </CardTitle>
              {getSignalIcon(signal.type)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{signal.count}</div>
              <p className="text-xs text-muted-foreground">
                Across {signal.pages} {signal.pages === 1 ? 'page' : 'pages'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frustration Signals by Type</CardTitle>
          <CardDescription>Distribution of user frustration incidents</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={frustrationData?.signalsByType || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Problem Pages</CardTitle>
            <CardDescription>Pages with most frustration signals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {frustrationData?.problemPages && frustrationData.problemPages.length > 0 ? (
                frustrationData.problemPages.map((page: any) => (
                  <div key={page.page} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm truncate">{page.page}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {Object.entries(page.types).map(([type, count]) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}: {count as number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant="destructive">{page.total} total</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No frustration signals detected</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>Latest frustration signals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {frustrationData?.recentSignals && frustrationData.recentSignals.length > 0 ? (
                frustrationData.recentSignals.slice(0, 20).map((signal: any) => (
                  <div key={signal.id} className="flex items-center justify-between p-2 border-b">
                    <div className="flex items-center gap-2 flex-1">
                      {getSignalIcon(signal.signal_type)}
                      <div className="flex-1">
                        <Badge variant={getSignalBadgeVariant(signal.signal_type)} className="text-xs">
                          {signal.signal_type}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{signal.page_path}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">x{signal.count}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(signal.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent signals</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
