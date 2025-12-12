import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Clock, RefreshCw, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface SendTimeData {
  id: string;
  campaign_id: string | null;
  day_of_week: number;
  hour_of_day: number;
  timezone: string;
  open_rate: number;
  reply_rate: number;
  sample_size: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SendTimeHeatmap() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [metric, setMetric] = useState<'open_rate' | 'reply_rate'>('reply_rate');
  const [calculating, setCalculating] = useState(false);

  const { data: sendTimeData, isLoading } = useQuery({
    queryKey: ['send-time-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instantly_send_time_analytics')
        .select('*');

      if (error) throw error;
      return data as SendTimeData[];
    }
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
      setCalculating(true);
      const { data, error } = await supabase.functions.invoke('calculate-optimal-send-time');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['send-time-analytics'] });
      toast({
        title: 'Analysis Complete',
        description: 'Send time optimization data has been updated.'
      });
      setCalculating(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to calculate optimal send times.',
        variant: 'destructive'
      });
      setCalculating(false);
    }
  });

  // Build heatmap data
  const heatmapData: Record<string, number> = {};
  let maxValue = 0;
  
  sendTimeData?.forEach(item => {
    const key = `${item.day_of_week}-${item.hour_of_day}`;
    const value = metric === 'open_rate' ? item.open_rate : item.reply_rate;
    heatmapData[key] = (heatmapData[key] || 0) + value;
    if (heatmapData[key] > maxValue) maxValue = heatmapData[key];
  });

  const getCellColor = (value: number) => {
    if (!value || maxValue === 0) return 'bg-muted/20';
    const intensity = value / maxValue;
    if (intensity >= 0.8) return 'bg-green-500';
    if (intensity >= 0.6) return 'bg-green-400';
    if (intensity >= 0.4) return 'bg-yellow-400';
    if (intensity >= 0.2) return 'bg-orange-400';
    return 'bg-red-400/50';
  };

  // Find best times
  const bestTimes = Object.entries(heatmapData)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([key, value]) => {
      const [day, hour] = key.split('-').map(Number);
      return { day: DAYS[day], hour, value };
    });

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Send Time Optimization
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={metric} onValueChange={(v) => setMetric(v as 'open_rate' | 'reply_rate')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reply_rate">Reply Rate</SelectItem>
                <SelectItem value="open_rate">Open Rate</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => calculateMutation.mutate()}
              disabled={calculating}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${calculating ? 'animate-spin' : ''}`} />
              Analyze
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-6">
            {/* Heatmap */}
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Hour labels */}
                <div className="flex mb-1 ml-12">
                  {HOURS.filter(h => h % 2 === 0).map(hour => (
                    <div 
                      key={hour} 
                      className="text-xs text-muted-foreground text-center"
                      style={{ width: '32px', marginLeft: hour === 0 ? 0 : '32px' }}
                    >
                      {hour}:00
                    </div>
                  ))}
                </div>

                {/* Grid */}
                {DAYS.map((day, dayIndex) => (
                  <div key={day} className="flex items-center gap-1 mb-1">
                    <div className="w-10 text-xs text-muted-foreground text-right pr-2">
                      {day}
                    </div>
                    <div className="flex gap-0.5">
                      {HOURS.map(hour => {
                        const key = `${dayIndex}-${hour}`;
                        const value = heatmapData[key] || 0;
                        
                        return (
                          <motion.div
                            key={hour}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (dayIndex * 24 + hour) * 0.002 }}
                            className={`w-4 h-4 rounded-sm ${getCellColor(value)} cursor-pointer transition-transform hover:scale-125`}
                            title={`${day} ${hour}:00 - ${metric === 'reply_rate' ? 'Reply' : 'Open'} Rate: ${value.toFixed(1)}%`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="text-xs text-muted-foreground">Low</span>
                  <div className="flex gap-0.5">
                    <div className="w-4 h-4 rounded-sm bg-red-400/50" />
                    <div className="w-4 h-4 rounded-sm bg-orange-400" />
                    <div className="w-4 h-4 rounded-sm bg-yellow-400" />
                    <div className="w-4 h-4 rounded-sm bg-green-400" />
                    <div className="w-4 h-4 rounded-sm bg-green-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">High</span>
                </div>
              </div>
            </div>

            {/* Best Times */}
            <div className="grid md:grid-cols-5 gap-3">
              {bestTimes.map((time, index) => (
                <motion.div
                  key={`${time.day}-${time.hour}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                    <CardContent className="p-3 text-center">
                      <Badge variant="secondary" className="mb-2">
                        #{index + 1}
                      </Badge>
                      <p className="font-bold text-lg">{time.day}</p>
                      <p className="text-primary">{time.hour}:00</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-sm text-green-500">{time.value.toFixed(1)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Recommendations */}
            {bestTimes.length > 0 && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  AI Recommendation
                </h4>
                <p className="text-sm text-muted-foreground">
                  Based on your historical data, the best time to send emails is{' '}
                  <span className="text-primary font-medium">{bestTimes[0]?.day} at {bestTimes[0]?.hour}:00</span>.
                  Emails sent during this window have a{' '}
                  <span className="text-green-500 font-medium">{bestTimes[0]?.value.toFixed(1)}%</span>{' '}
                  {metric === 'reply_rate' ? 'reply' : 'open'} rate.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
