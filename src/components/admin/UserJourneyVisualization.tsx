import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight } from 'lucide-react';

interface JourneyStep {
  fromPage: string;
  toPage: string;
  count: number;
  avgTime: number;
  conversionRate: number;
}

export function UserJourneyVisualization() {
  const [journeys, setJourneys] = useState<JourneyStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJourneys();
  }, []);

  const fetchJourneys = async () => {
    try {
      const { data } = await supabase
        .from('user_journey_tracking')
        .select('from_page, to_page, time_to_action_ms, conversion_event')
        .gte('created_at', new Date(Date.now() - 86400000).toISOString());

      if (!data) return;

      // Aggregate journey steps
      const journeyMap = new Map<string, { count: number; totalTime: number; conversions: number }>();

      data.forEach(step => {
        const key = `${step.from_page || 'entry'}->${step.to_page || 'exit'}`;
        const existing = journeyMap.get(key) || { count: 0, totalTime: 0, conversions: 0 };
        
        journeyMap.set(key, {
          count: existing.count + 1,
          totalTime: existing.totalTime + (step.time_to_action_ms || 0),
          conversions: existing.conversions + (step.conversion_event ? 1 : 0),
        });
      });

      const steps: JourneyStep[] = Array.from(journeyMap.entries())
        .map(([key, stats]) => {
          const [fromPage, toPage] = key.split('->');
          return {
            fromPage,
            toPage,
            count: stats.count,
            avgTime: Math.round(stats.totalTime / stats.count / 1000),
            conversionRate: Math.round((stats.conversions / stats.count) * 100),
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setJourneys(steps);
    } catch (error) {
      console.error('Failed to fetch journey data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading journey data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top User Journeys (24h)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {journeys.map((journey, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm px-3 py-1 bg-muted rounded-md">{journey.fromPage}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm px-3 py-1 bg-muted rounded-md">{journey.toPage}</span>
                </div>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">{journey.count}</span> users
                </div>
                <div>
                  <span className="font-medium text-foreground">{journey.avgTime}s</span> avg
                </div>
                <div>
                  <span className="font-medium text-foreground">{journey.conversionRate}%</span> converted
                </div>
              </div>
            </div>
          ))}
          {journeys.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No journey data available yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
