import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, Calendar as CalendarIcon, FileText, Table, LineChart } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function ExportReportsTab() {
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const exportToCSV = async (tableName: string, filename: string) => {
    try {
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.info('No data available for the selected date range');
        return;
      }
      
      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = (row as any)[header];
            // Handle JSON and special characters
            if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
            if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
            return value;
          }).join(',')
        )
      ].join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${filename} exported successfully`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error.message}`);
    }
  };

  const exportOptions = [
    {
      title: 'User Session Events',
      description: 'All user interaction events',
      table: 'user_session_events',
      filename: 'user_session_events',
      icon: Table,
    },
    {
      title: 'Device Information',
      description: 'Device fingerprints and context',
      table: 'user_device_info',
      filename: 'device_info',
      icon: Table,
    },
    {
      title: 'Feature Usage',
      description: 'Feature-level usage analytics',
      table: 'user_feature_usage',
      filename: 'feature_usage',
      icon: FileText,
    },
    {
      title: 'Performance Metrics',
      description: 'Web Vitals and performance data',
      table: 'user_performance_metrics',
      filename: 'performance_metrics',
      icon: LineChart,
    },
    {
      title: 'Page Analytics',
      description: 'Page views, time, and engagement',
      table: 'user_page_analytics',
      filename: 'page_analytics',
      icon: FileText,
    },
    {
      title: 'Frustration Signals',
      description: 'User frustration and error events',
      table: 'user_frustration_signals',
      filename: 'frustration_signals',
      icon: Table,
    },
    {
      title: 'Search Analytics',
      description: 'Search queries and results',
      table: 'user_search_analytics',
      filename: 'search_analytics',
      icon: Table,
    },
    {
      title: 'User Journeys',
      description: 'Journey tracking and conversion',
      table: 'user_journey_tracking',
      filename: 'user_journeys',
      icon: FileText,
    },
    {
      title: 'Candidate Activity',
      description: 'Candidate-specific metrics',
      table: 'candidate_activity_metrics',
      filename: 'candidate_activity',
      icon: FileText,
    },
    {
      title: 'Admin Actions',
      description: 'Admin audit activity log',
      table: 'admin_audit_activity',
      filename: 'admin_actions',
      icon: Table,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card key={option.table} className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20 hover:border-primary/30 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="w-5 h-5" />
                  {option.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
                <Button 
                  onClick={() => exportToCSV(option.table, option.filename)}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Export Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date Range:</span>
              <span className="font-medium">
                {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Export Format:</span>
              <span className="font-medium">CSV (UTF-8)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available Tables:</span>
              <span className="font-medium">{exportOptions.length} datasets</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
