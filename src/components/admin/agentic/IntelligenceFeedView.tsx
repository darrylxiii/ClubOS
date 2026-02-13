import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Flame, Snowflake, AlertTriangle, TrendingUp, Eye, X, Signal } from 'lucide-react';

interface PredictiveSignal {
  id: string;
  signal_type: string;
  entity_type: string;
  entity_id: string;
  signal_strength: number;
  evidence: any;
  recommended_actions: any;
  is_active: boolean;
  acknowledged: boolean;
  created_at: string;
}

const SIGNAL_CONFIG: Record<string, { icon: typeof Flame; color: string; bg: string; label: string }> = {
  heating_up: { icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: 'Heating Up' },
  cooling_down: { icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Cooling Down' },
  hiring_intent: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10 border-success/20', label: 'Hiring Intent' },
  relationship_risk: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20', label: 'Relationship Risk' },
  stalling: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10 border-warning/20', label: 'Stalling' },
};

const getSignalConfig = (type: string) => {
  const key = Object.keys(SIGNAL_CONFIG).find((k) => type?.toLowerCase().includes(k));
  return SIGNAL_CONFIG[key || ''] || { icon: Signal, color: 'text-muted-foreground', bg: 'bg-muted/30 border-border/30', label: type || 'Unknown' };
};

export default function IntelligenceFeedView() {
  const [signals, setSignals] = useState<PredictiveSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignals = async () => {
      const { data, error } = await supabase
        .from('predictive_signals')
        .select('*')
        .eq('is_active', true)
        .order('signal_strength', { ascending: false })
        .limit(100);

      if (!error && data) setSignals(data);
      setLoading(false);
    };

    fetchSignals();
    const sub = supabase
      .channel('signals-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictive_signals' }, () => fetchSignals())
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const handleAcknowledge = async (id: string) => {
    await supabase
      .from('predictive_signals')
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    setSignals((prev) => prev.map((s) => (s.id === id ? { ...s, acknowledged: true } : s)));
  };

  const handleDismiss = async (id: string) => {
    await supabase
      .from('predictive_signals')
      .update({ is_active: false, acknowledged: true, acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    setSignals((prev) => prev.filter((s) => s.id !== id));
  };

  const filtered = filter
    ? signals.filter((s) => s.signal_type?.toLowerCase().includes(filter))
    : signals;

  const signalTypes = [...new Set(signals.map((s) => s.signal_type))];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Signal className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Active Signals</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Your agents are monitoring the environment. Signals will appear here when patterns are detected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === null ? 'primary' : 'ghost'}
          onClick={() => setFilter(null)}
        >
          All ({signals.length})
        </Button>
        {signalTypes.map((type) => {
          const config = getSignalConfig(type);
          const count = signals.filter((s) => s.signal_type === type).length;
          return (
            <Button
              key={type}
              size="sm"
              variant={filter === type?.toLowerCase() ? 'primary' : 'ghost'}
              onClick={() => setFilter(type?.toLowerCase() || null)}
            >
              <config.icon className={`h-3 w-3 mr-1 ${config.color}`} />
              {config.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Signal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((signal) => {
          const config = getSignalConfig(signal.signal_type);
          const Icon = config.icon;
          const evidence = typeof signal.evidence === 'object' ? signal.evidence : {};
          const actions = Array.isArray(signal.recommended_actions)
            ? signal.recommended_actions
            : typeof signal.recommended_actions === 'object' && signal.recommended_actions
            ? [signal.recommended_actions]
            : [];

          return (
            <Card
              key={signal.id}
              variant="static"
              className={`relative overflow-hidden transition-all hover:scale-[1.01] ${config.bg} ${
                signal.acknowledged ? 'opacity-60' : ''
              }`}
            >
              {/* Strength bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-muted/20">
                <div
                  className={`h-full transition-all ${
                    signal.signal_strength >= 0.8
                      ? 'bg-destructive'
                      : signal.signal_strength >= 0.5
                      ? 'bg-warning'
                      : 'bg-success'
                  }`}
                  style={{ width: `${signal.signal_strength * 100}%` }}
                />
              </div>

              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{config.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{signal.entity_type}</p>
                    </div>
                  </div>
                  <Badge
                    variant={signal.signal_strength >= 0.8 ? 'destructive' : 'secondary'}
                    className="text-xs font-mono"
                  >
                    {Math.round(signal.signal_strength * 100)}%
                  </Badge>
                </div>

                {/* Evidence */}
                {Object.keys(evidence).length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {Object.entries(evidence)
                      .slice(0, 3)
                      .map(([key, val]) => (
                        <p key={key}>
                          <span className="font-medium text-foreground/70">{key.replace(/_/g, ' ')}:</span>{' '}
                          {String(val)}
                        </p>
                      ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
                </div>

                {/* Actions */}
                {!signal.acknowledged && (
                  <div className="flex gap-2 pt-1">
                    {actions.length > 0 && (
                      <Button size="sm" variant="primary" className="text-xs flex-1" onClick={() => handleAcknowledge(signal.id)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Investigate
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => handleDismiss(signal.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {signal.acknowledged && (
                  <Badge variant="outline" className="text-xs">Acknowledged</Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
