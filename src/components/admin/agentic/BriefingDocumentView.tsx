import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays } from 'date-fns';
import {
  Signal, Zap, Target, Calendar, FileText, RefreshCw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface Briefing {
  id: string;
  user_id: string;
  briefing_date: string;
  content: any;
  created_at: string;
}

export default function BriefingDocumentView() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBriefing, setSelectedBriefing] = useState<Briefing | null>(null);

  useEffect(() => {
    const fetchBriefings = async () => {
      const { data, error } = await supabase
        .from('daily_briefings')
        .select('*')
        .order('briefing_date', { ascending: false })
        .limit(30);

      if (!error && data) {
        setBriefings(data);
        if (data.length > 0) setSelectedBriefing(data[0]);
      }
      setLoading(false);
    };

    fetchBriefings();
  }, []);

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-daily-briefing', {});
      if (error) throw error;
      toast.success('Briefing generated');
      // Refetch
      const { data } = await supabase
        .from('daily_briefings')
        .select('*')
        .order('briefing_date', { ascending: false })
        .limit(30);
      if (data) {
        setBriefings(data);
        if (data.length > 0) setSelectedBriefing(data[0]);
      }
    } catch (err) {
      toast.error('Failed to generate briefing');
    } finally {
      setGenerating(false);
    }
  };

  const navigateDate = (dir: number) => {
    const newDate = dir > 0 ? subDays(selectedDate, -1) : subDays(selectedDate, 1);
    setSelectedDate(newDate);
    const dateStr = format(newDate, 'yyyy-MM-dd');
    const match = briefings.find((b) => b.briefing_date === dateStr);
    setSelectedBriefing(match || null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const content = selectedBriefing?.content || {};

  const sections = [
    {
      title: 'Predictive Signals',
      icon: Signal,
      color: 'text-warning',
      items: content.top_signals || [],
      render: (item: any) => (
        <div key={item.id || Math.random()} className="flex items-center justify-between py-1.5">
          <span className="text-sm">{item.signal_type || item.type || 'Signal'}</span>
          <Badge variant="secondary" className="text-xs">
            {item.entity_type || 'entity'} • {Math.round((item.signal_strength || 0) * 100)}%
          </Badge>
        </div>
      ),
    },
    {
      title: 'Agent Actions Overnight',
      icon: Zap,
      color: 'text-primary',
      value: content.agent_actions_count,
      render: null,
    },
    {
      title: 'Top Priorities',
      icon: Target,
      color: 'text-accent',
      items: content.top_priorities || [],
      render: (item: any, i: number) => (
        <div key={i} className="flex items-start gap-2 py-1.5">
          <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{i + 1}.</span>
          <span className="text-sm">{typeof item === 'string' ? item : item.description || item.title || JSON.stringify(item)}</span>
        </div>
      ),
    },
    {
      title: 'Stalled Candidates',
      icon: Target,
      color: 'text-destructive',
      value: content.stalled_candidates_count,
      render: null,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Date Nav + Generate */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium font-mono min-w-[120px] text-center">
            {format(selectedDate, 'MMM dd, yyyy')}
          </span>
          <Button size="sm" variant="ghost" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" variant="outline" onClick={handleGenerateNow} loading={generating}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Generate Now
        </Button>
      </div>

      {/* Briefing dates */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
        {briefings.slice(0, 14).map((b) => {
          const isSelected = selectedBriefing?.id === b.id;
          return (
            <button
              key={b.id}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card/40 hover:bg-card/60 text-muted-foreground border border-border/20'
              }`}
              onClick={() => {
                setSelectedBriefing(b);
                setSelectedDate(new Date(b.briefing_date));
              }}
            >
              {format(new Date(b.briefing_date), 'MMM dd')}
            </button>
          );
        })}
      </div>

      {/* Briefing Document */}
      {selectedBriefing ? (
        <Card variant="static" className="overflow-hidden">
          <CardHeader className="border-b border-border/20 bg-card/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">
                  Daily Intelligence Briefing — {format(new Date(selectedBriefing.briefing_date), 'EEEE, MMMM d')}
                </CardTitle>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                Generated {format(new Date(selectedBriefing.created_at), 'HH:mm')}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <div className="flex items-center gap-2 mb-3">
                  <section.icon className={`h-4 w-4 ${section.color}`} />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h4>
                </div>
                {section.value !== undefined && section.render === null ? (
                  <p className="text-2xl font-bold font-mono pl-6">{section.value || 0}</p>
                ) : section.items && section.items.length > 0 && section.render ? (
                  <div className="pl-6 divide-y divide-border/10">
                    {section.items.map(section.render)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground pl-6">No data for this section.</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Briefing for This Date</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No intelligence briefing was generated for this day.
          </p>
          <Button variant="primary" onClick={handleGenerateNow} loading={generating}>
            Generate Briefing
          </Button>
        </div>
      )}
    </div>
  );
}
