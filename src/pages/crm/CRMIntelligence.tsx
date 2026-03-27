import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Activity, AlertTriangle, ArrowRight, Brain, Heart,
  MessageSquare, Shield, TrendingDown, TrendingUp, Zap,
  RefreshCw, Users, BarChart3, Clock, Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRelationshipHealth, type RiskFilter } from '@/hooks/useRelationshipHealth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

// ─── Pattern Alert Types ────────────────────────────────────────────────────

interface PatternAlert {
  id: string;
  entity_type: string;
  entity_id: string;
  pattern_type: string;
  confidence: number;
  detected_at: string;
  severity: string | null;
  is_active: boolean;
  evidence: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
}

interface ChannelMetric {
  channel: string;
  total: number;
  inbound: number;
  outbound: number;
  avg_sentiment: number;
}

// ─── Pattern Display Helpers ────────────────────────────────────────────────

const PATTERN_CONFIG: Record<string, { label: string; icon: typeof TrendingDown; color: string; badgeVariant: 'destructive' | 'default' | 'secondary' | 'outline' }> = {
  going_cold: { label: 'Going Cold', icon: TrendingDown, color: 'text-blue-500', badgeVariant: 'default' },
  ghosting: { label: 'Ghosting', icon: AlertTriangle, color: 'text-red-500', badgeVariant: 'destructive' },
  needs_escalation: { label: 'Needs Escalation', icon: Shield, color: 'text-orange-500', badgeVariant: 'destructive' },
  ready_to_convert: { label: 'Ready to Convert', icon: Zap, color: 'text-green-500', badgeVariant: 'default' },
  highly_engaged: { label: 'Highly Engaged', icon: Heart, color: 'text-pink-500', badgeVariant: 'secondary' },
  heating_up: { label: 'Heating Up', icon: TrendingUp, color: 'text-amber-500', badgeVariant: 'secondary' },
  sentiment_shift: { label: 'Sentiment Shift', icon: Activity, color: 'text-purple-500', badgeVariant: 'outline' },
  response_time_change: { label: 'Response Time Change', icon: Clock, color: 'text-cyan-500', badgeVariant: 'outline' },
  objection_raising: { label: 'Raising Objections', icon: MessageSquare, color: 'text-yellow-500', badgeVariant: 'default' },
  re_engaged: { label: 'Re-engaged', icon: RefreshCw, color: 'text-emerald-500', badgeVariant: 'secondary' },
};

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

function getRiskBadge(level: string) {
  const { t } = useTranslation('common');
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || colors.low}`}>{level}</span>;
}

function sentimentBar(score: number) {
  const pct = Math.round(((score + 1) / 2) * 100); // -1 to 1 → 0 to 100
  const color = pct >= 60 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{score.toFixed(2)}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CRMIntelligence() {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const { relationships, loading: healthLoading, stats, refetch } = useRelationshipHealth(
    entityFilter !== 'all' ? entityFilter : undefined,
    riskFilter
  );

  const [patterns, setPatterns] = useState<PatternAlert[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelMetric[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);

  // Fetch cross-channel patterns
  useEffect(() => {
    const fetchPatterns = async () => {
      setPatternsLoading(true);
      const { data, error } = await supabase
        .from('cross_channel_patterns')
        .select('*')
        .eq('is_active', true)
        .order('confidence', { ascending: false })
        .limit(50);

      if (!error && data) setPatterns(data);
      setPatternsLoading(false);
    };
    fetchPatterns();
  }, []);

  // Fetch channel performance via edge function
  useEffect(() => {
    const fetchChannels = async () => {
      setChannelsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('communication-intelligence-query', {
          body: { queryType: 'channel_performance' }
        });
        if (!error && data?.channels) {
          setChannels(data.channels);
        }
      } catch {
        // Edge function may not be deployed yet — fall back to direct query
        const { data } = await supabase
          .from('unified_communications')
          .select('channel, direction, sentiment_score');

        if (data) {
          const channelMap: Record<string, ChannelMetric> = {};
          for (const row of data) {
            const ch = row.channel || 'unknown';
            if (!channelMap[ch]) channelMap[ch] = { channel: ch, total: 0, inbound: 0, outbound: 0, avg_sentiment: 0 };
            channelMap[ch].total++;
            if (row.direction === 'inbound') channelMap[ch].inbound++;
            else channelMap[ch].outbound++;
            channelMap[ch].avg_sentiment += (row.sentiment_score || 0);
          }
          const result = Object.values(channelMap).map(c => ({
            ...c,
            avg_sentiment: c.total > 0 ? c.avg_sentiment / c.total : 0,
          })).sort((a, b) => b.total - a.total);
          setChannels(result);
        }
      }
      setChannelsLoading(false);
    };
    fetchChannels();
  }, []);

  // Derived stats
  const atRiskRelationships = relationships.filter(r => r.risk_level === 'high' || r.risk_level === 'critical');
  const hotLeads = patterns.filter(p => p.pattern_type === 'ready_to_convert' || p.pattern_type === 'highly_engaged');
  const warningPatterns = patterns.filter(p => ['going_cold', 'ghosting', 'needs_escalation'].includes(p.pattern_type));
  const positivePatterns = patterns.filter(p => ['ready_to_convert', 'highly_engaged', 'heating_up', 're_engaged'].includes(p.pattern_type));

  const kpis = [
    { label: 'Relationships', value: stats.total, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'At Risk', value: stats.atRisk + stats.critical, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Hot Leads', value: hotLeads.length, icon: Zap, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Active Patterns', value: patterns.length, icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Warning Signals', value: warningPatterns.length, icon: TrendingDown, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Positive Signals', value: positivePatterns.length, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <RoleGate allowedRoles={['admin', 'strategist']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />{'CRM Intelligence'}</h1>
            <p className="text-muted-foreground mt-1">{'AI-powered relationship health, pattern detection, and predictive signals'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border-border/50">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                    <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold">
                  {healthLoading && typeof kpi.value === 'number' ? <Skeleton className="h-8 w-12" /> : kpi.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Risk Distribution Bar */}
        {!healthLoading && stats.total > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">{'Risk Distribution'}</span>
                <span className="text-xs text-muted-foreground">({stats.total} relationships)</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {stats.critical > 0 && (
                  <div className="bg-red-500 transition-all" style={{ width: `${(stats.critical / stats.total) * 100}%` }} title={`Critical: ${stats.critical}`} />
                )}
                {stats.atRisk > 0 && (
                  <div className="bg-orange-500 transition-all" style={{ width: `${(stats.atRisk / stats.total) * 100}%` }} title={`High: ${stats.atRisk}`} />
                )}
                {stats.needsAttention > 0 && (
                  <div className="bg-amber-500 transition-all" style={{ width: `${(stats.needsAttention / stats.total) * 100}%` }} title={`Medium: ${stats.needsAttention}`} />
                )}
                {stats.healthy > 0 && (
                  <div className="bg-green-500 transition-all" style={{ width: `${(stats.healthy / stats.total) * 100}%` }} title={`Low: ${stats.healthy}`} />
                )}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical: {stats.critical}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> High: {stats.atRisk}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium: {stats.needsAttention}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Healthy: {stats.healthy}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="health" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid lg:grid-cols-3">
            <TabsTrigger value="health">{'Relationship Health'}</TabsTrigger>
            <TabsTrigger value="patterns">{'Pattern Alerts'}</TabsTrigger>
            <TabsTrigger value="channels">{'Channel Performance'}</TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: Relationship Health ──────────────────────────── */}
          <TabsContent value="health" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={'Entity type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{'All Types'}</SelectItem>
                  <SelectItem value="candidate">{t('cRMIntelligence.text1')}</SelectItem>
                  <SelectItem value="prospect">{t('cRMIntelligence.text2')}</SelectItem>
                  <SelectItem value="company">{t('cRMIntelligence.text3')}</SelectItem>
                  <SelectItem value="partner">{t('cRMIntelligence.text4')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={'Risk level'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{'All Risks'}</SelectItem>
                  <SelectItem value="critical">{t('cRMIntelligence.text5')}</SelectItem>
                  <SelectItem value="high">{t('cRMIntelligence.text6')}</SelectItem>
                  <SelectItem value="medium">{t('cRMIntelligence.text7')}</SelectItem>
                  <SelectItem value="low">{t('cRMIntelligence.text8')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {healthLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : relationships.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">{'No relationships found matching your filters.'}</CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {relationships.slice(0, 30).map((rel) => (
                  <Card key={rel.id} className="hover:bg-accent/30 transition-colors">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {rel.entity_name?.slice(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{rel.entity_name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{rel.entity_type}</Badge>
                              {getRiskBadge(rel.risk_level)}
                            </div>
                            <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                              <span>{rel.total_communications} msgs</span>
                              <span>↓{rel.inbound_count} ↑{rel.outbound_count}</span>
                              <span>Response: {(rel.response_rate * 100).toFixed(0)}%</span>
                              {rel.days_since_contact > 0 && (
                                <span className={rel.days_since_contact > 7 ? 'text-orange-500' : ''}>
                                  {rel.days_since_contact}d ago
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <div className="text-xs text-muted-foreground mb-0.5">{t('cRMIntelligence.text9')}</div>
                            <div className="flex items-center gap-2">
                              <Progress value={rel.health_score} className="w-16 h-1.5" />
                              <span className="text-xs font-medium w-7 text-right">{rel.health_score}</span>
                            </div>
                          </div>
                          <div className="hidden md:block">
                            {sentimentBar(rel.avg_sentiment)}
                          </div>
                          {rel.recommended_action && (
                            <Badge variant="secondary" className="text-[10px] hidden lg:flex">
                              {rel.recommended_action}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {relationships.length > 30 && (
                  <p className="text-xs text-center text-muted-foreground py-2">
                    Showing 30 of {relationships.length} relationships
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          {/* ─── TAB 2: Pattern Alerts ────────────────────────────── */}
          <TabsContent value="patterns" className="space-y-4">
            {patternsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : patterns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{'No active patterns detected'}</p>
                  <p className="text-sm mt-1">{'Pattern detection runs automatically on communication data.'}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Pattern Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(
                    patterns.reduce((acc, p) => {
                      acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const config = PATTERN_CONFIG[type] || { label: type, icon: Activity, color: 'text-gray-500', badgeVariant: 'outline' as const };
                      return (
                        <Card key={type}>
                          <CardContent className="py-3 px-4 flex items-center gap-3">
                            <config.icon className={`h-5 w-5 ${config.color}`} />
                            <div>
                              <p className="text-sm font-medium">{config.label}</p>
                              <p className="text-lg font-bold">{count}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>

                {/* Pattern List */}
                <div className="space-y-2">
                  {patterns.map((pattern) => {
                    const config = PATTERN_CONFIG[pattern.pattern_type] || { label: pattern.pattern_type, icon: Activity, color: 'text-gray-500', badgeVariant: 'outline' as const };
                    return (
                      <Card key={pattern.id}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg bg-muted mt-0.5`}>
                                <config.icon className={`h-4 w-4 ${config.color}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{config.label}</span>
                                  <Badge variant={config.badgeVariant} className="text-[10px]">
                                    {(pattern.confidence * 100).toFixed(0)}% confidence
                                  </Badge>
                                  {pattern.severity && (
                                    <Badge variant={pattern.severity === 'critical' ? 'destructive' : 'outline'} className="text-[10px]">
                                      {pattern.severity}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {pattern.entity_type}: {pattern.entity_id.slice(0, 8)}...
                                  {' · '}
                                  Detected {formatDistanceToNow(new Date(pattern.detected_at), { addSuffix: true })}
                                </p>
                                {pattern.details && typeof pattern.details === 'object' && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {Object.entries(pattern.details).slice(0, 3).map(([k, v]) => (
                                      <span key={k} className="mr-3">{k}: {String(v)}</span>
                                    ))}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── TAB 3: Channel Performance ──────────────────────── */}
          <TabsContent value="channels" className="space-y-4">
            {channelsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : channels.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{'No communication data yet'}</p>
                  <p className="text-sm mt-1">{'Channel metrics will appear once communications are tracked.'}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Total Communications */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{'Communications by Channel'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {channels.map((ch) => {
                        const maxTotal = Math.max(...channels.map(c => c.total), 1);
                        const channelIcons: Record<string, string> = {
                          email: '📧', whatsapp: '💬', meeting: '🤝', phone: '📞',
                          linkedin: '🔗', chat: '💬', sms: '📱', dm: '✉️',
                        };
                        return (
                          <div key={ch.channel} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2">
                                <span>{channelIcons[ch.channel] || '📨'}</span>
                                <span className="font-medium capitalize">{ch.channel}</span>
                              </span>
                              <span className="text-muted-foreground">
                                {ch.total} total · ↓{ch.inbound} ↑{ch.outbound}
                              </span>
                            </div>
                            <div className="flex gap-1 h-2">
                              <div
                                className="bg-blue-500 rounded-l-full transition-all"
                                style={{ width: `${(ch.inbound / maxTotal) * 100}%` }}
                                title={`Inbound: ${ch.inbound}`}
                              />
                              <div
                                className="bg-emerald-500 rounded-r-full transition-all"
                                style={{ width: `${(ch.outbound / maxTotal) * 100}%` }}
                                title={`Outbound: ${ch.outbound}`}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Sentiment: {ch.avg_sentiment.toFixed(2)}</span>
                              <span>Response ratio: {ch.inbound > 0 ? (ch.outbound / ch.inbound).toFixed(1) : '—'}x</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{t('cRMIntelligence.text10')}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{t('cRMIntelligence.text11')}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
