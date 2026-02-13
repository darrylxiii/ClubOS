import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  Bot, MessageSquare, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
  Shield, Zap, Eye, Brain,
} from 'lucide-react';
import AgentFeedbackButton from './AgentFeedbackButton';

interface Agent {
  id: string;
  agent_name: string;
  display_name: string;
  description: string | null;
  capabilities: string[];
  autonomy_level: string | null;
  is_active: boolean;
  config: any;
}

interface AgentDecision {
  id: string;
  agent_name: string;
  decision_type: string;
  decision_made: string;
  confidence_score: number | null;
  was_overridden: boolean;
  created_at: string;
}

const AUTONOMY_COLORS: Record<string, string> = {
  autonomous: 'bg-success/20 text-success border-success/30',
  suggest: 'bg-warning/20 text-warning border-warning/30',
  manual: 'bg-muted/30 text-muted-foreground border-border/30',
};

const AGENT_ICONS: Record<string, typeof Bot> = {
  orchestrator: Brain,
  headhunter: Zap,
  monitor: Eye,
  defender: Shield,
};

export default function AgentDirectoryView({ onOpenChat }: { onOpenChat?: (agentName: string) => void }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDecisions, setShowDecisions] = useState(true);
  const [lastActions, setLastActions] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetch = async () => {
      const [agentsRes, decisionsRes] = await Promise.all([
        supabase.from('agent_registry').select('*').eq('is_active', true).order('agent_name'),
        supabase
          .from('agent_decision_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (agentsRes.data) setAgents(agentsRes.data);
      if (decisionsRes.data) {
        setDecisions(decisionsRes.data);
        // Get last action per agent
        const last: Record<string, string> = {};
        for (const d of decisionsRes.data) {
          if (!last[d.agent_name]) last[d.agent_name] = d.created_at;
        }
        setLastActions(last);
      }
      setLoading(false);
    };

    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAgentIcon = (name: string) => {
    const key = Object.keys(AGENT_ICONS).find((k) => name.toLowerCase().includes(k));
    return AGENT_ICONS[key || ''] || Bot;
  };

  const isRecentlyActive = (agentName: string) => {
    const last = lastActions[agentName];
    if (!last) return false;
    return new Date(last).getTime() > Date.now() - 60 * 60 * 1000; // Active in last hour
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const Icon = getAgentIcon(agent.agent_name);
          const active = isRecentlyActive(agent.agent_name);
          const autonomyClass = AUTONOMY_COLORS[agent.autonomy_level || 'manual'] || AUTONOMY_COLORS.manual;

          return (
            <Card
              key={agent.id}
              variant="interactive"
              className="group"
              onClick={() => onOpenChat?.(agent.agent_name)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                          active ? 'bg-success' : 'bg-muted-foreground/40'
                        }`}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold leading-tight">{agent.display_name}</h4>
                      <p className="text-xs text-muted-foreground">{agent.agent_name}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${autonomyClass}`}>
                    {agent.autonomy_level || 'manual'}
                  </Badge>
                </div>

                {agent.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                )}

                <div className="flex flex-wrap gap-1">
                  {agent.capabilities?.slice(0, 3).map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-[10px] font-normal">
                      {cap}
                    </Badge>
                  ))}
                  {(agent.capabilities?.length || 0) > 3 && (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      +{agent.capabilities.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/20">
                  <span className="text-[10px] text-muted-foreground">
                    {lastActions[agent.agent_name]
                      ? `Active ${formatDistanceToNow(new Date(lastActions[agent.agent_name]), { addSuffix: true })}`
                      : 'No recent activity'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChat?.(agent.agent_name);
                    }}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Decision Log */}
      <div>
        <button
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
          onClick={() => setShowDecisions(!showDecisions)}
        >
          {showDecisions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Recent Decisions ({decisions.length})
        </button>

        {showDecisions && (
          <div className="space-y-2">
            {decisions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No agent decisions recorded yet.</p>
            ) : (
              decisions.map((d) => (
                <Card key={d.id} variant="static" className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{d.agent_name}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{d.decision_type}</Badge>
                        {d.confidence_score != null && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {Math.round(d.confidence_score * 100)}%
                          </span>
                        )}
                        {d.was_overridden && (
                          <Badge variant="destructive" className="text-[10px]">Overridden</Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground/80 truncate">{d.decision_made}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <AgentFeedbackButton decisionId={d.id} agentName={d.agent_name} />
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
