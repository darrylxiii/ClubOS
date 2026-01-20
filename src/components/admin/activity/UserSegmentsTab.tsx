import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

export function UserSegmentsTab() {
  const { data: deviceData, isLoading } = useQuery({
    queryKey: ['user-segments-device'],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // Try to get device info from dedicated table
      const { data: deviceInfo } = await supabase
        .from('user_device_info')
        .select('device_type, os, browser, timezone')
        .gte('created_at', sevenDaysAgo);
      
      // Fallback: derive from session events metadata
      if (!deviceInfo || deviceInfo.length === 0) {
        const { data: sessionEvents } = await supabase
          .from('user_session_events')
          .select('metadata')
          .gte('created_at', sevenDaysAgo);
        
        const derivedData = (sessionEvents || []).map((e: any) => ({
          device_type: e.metadata?.deviceType || 'unknown',
          os: e.metadata?.os || 'Unknown',
          browser: e.metadata?.browser || 'Unknown',
          timezone: e.metadata?.timezone || 'Unknown',
        }));
        
        return derivedData;
      }
      
      return deviceInfo || [];
    },
    refetchInterval: 30000,
  });

  const { data: roleActivity } = useQuery({
    queryKey: ['user-segments-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_session_events')
        .select('user_id, page_path')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;
      
      // Categorize by path patterns
      const candidates = data?.filter(e => e.page_path?.includes('/jobs') || e.page_path?.includes('/applications')).length || 0;
      const partners = data?.filter(e => e.page_path?.includes('/hiring') || e.page_path?.includes('/company-intelligence')).length || 0;
      const admins = data?.filter(e => e.page_path?.includes('/admin')).length || 0;
      
      return [
        { name: 'Candidates', value: candidates, color: 'hsl(var(--chart-1))' },
        { name: 'Partners', value: partners, color: 'hsl(var(--chart-2))' },
        { name: 'Admins', value: admins, color: 'hsl(var(--chart-3))' },
      ];
    },
    refetchInterval: 30000,
  });

  // Device breakdown
  const deviceBreakdown = deviceData?.reduce((acc, item) => {
    const key = item.device_type || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deviceChartData = Object.entries(deviceBreakdown || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: name === 'mobile' ? 'hsl(var(--chart-1))' : name === 'desktop' ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-3))',
  }));

  // Browser breakdown
  const browserBreakdown = deviceData?.reduce((acc, item) => {
    const key = item.browser || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const browserChartData = Object.entries(browserBreakdown || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], index) => ({
      name,
      value,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading segments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Role Activity Breakdown */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>User Activity by Role (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roleActivity || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {roleActivity?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader>
            <CardTitle>Device Distribution (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deviceChartData.map((device) => (
                <div key={device.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device.name)}
                    <span className="text-sm font-medium">{device.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all" 
                        style={{ 
                          width: `${(device.value / (deviceData?.length || 1)) * 100}%`,
                          backgroundColor: device.color 
                        }} 
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{device.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Browser Breakdown */}
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader>
            <CardTitle>Top Browsers (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={browserChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))">
                  {browserChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timezone Distribution */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>User Timezones (7d)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(
              deviceData?.reduce((acc, item) => {
                const tz = item.timezone || 'Unknown';
                acc[tz] = (acc[tz] || 0) + 1;
                return acc;
              }, {} as Record<string, number>) || {}
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([timezone, count]) => (
                <div key={timezone} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{timezone}</span>
                  <span className="text-muted-foreground">{count} users</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
