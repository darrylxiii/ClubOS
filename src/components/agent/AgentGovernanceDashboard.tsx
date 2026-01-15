import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  Bot, 
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  BarChart3
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AgentDecision {
  id: string;
  agent_name: string;
  decision_type: string;
  decision_made: string;
  reasoning: Record<string, unknown>;
  confidence_score: number | null;
  human_can_override: boolean;
  was_overridden: boolean;
  created_at: string;
}

interface AgentRegistry {
  id: string;
  agent_name: string;
  display_name: string;
  description: string;
  capabilities: string[];
  autonomy_level: string;
  is_active: boolean;
}

export function AgentGovernanceDashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch agent registry
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agent-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_registry')
        .select('*')
        .order('agent_name');
      
      if (error) throw error;
      return data as AgentRegistry[];
    },
  });

  // Fetch recent decisions
  const { data: decisions, isLoading: decisionsLoading } = useQuery({
    queryKey: ['agent-decisions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_decision_log')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AgentDecision[];
    },
    enabled: !!user?.id,
  });

  // Calculate stats
  const stats = {
    totalDecisions: decisions?.length || 0,
    overriddenDecisions: decisions?.filter(d => d.was_overridden).length || 0,
    avgConfidence: decisions?.length 
      ? (decisions.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / decisions.length * 100).toFixed(1)
      : 0,
    activeAgents: agents?.filter(a => a.is_active).length || 0,
  };

  const overrideRate = stats.totalDecisions 
    ? ((stats.overriddenDecisions / stats.totalDecisions) * 100).toFixed(1)
    : 0;

  if (agentsLoading || decisionsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAgents}</div>
            <p className="text-xs text-muted-foreground">Working for you</p>
          </CardContent>
        </Card>

        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDecisions}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgConfidence}%</div>
            <p className="text-xs text-muted-foreground">Decision accuracy</p>
          </CardContent>
        </Card>

        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Override Rate</CardTitle>
            <Shield className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overrideRate}%</div>
            <p className="text-xs text-muted-foreground">Human corrections</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Agent Governance
          </CardTitle>
          <CardDescription>
            Monitor and control agent behavior, review decisions, and manage autonomy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Agents</TabsTrigger>
              <TabsTrigger value="decisions">Decision Log</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-4 md:grid-cols-2">
                {agents?.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="decisions">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {decisions?.map((decision) => (
                    <DecisionItem key={decision.id} decision={decision} />
                  ))}
                  {!decisions?.length && (
                    <div className="text-center py-8 text-muted-foreground">
                      No decisions recorded yet
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="performance">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Performance Analytics</h3>
                <p className="text-muted-foreground max-w-md">
                  Detailed performance metrics will appear here as agents make more decisions
                  and outcomes are tracked.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentRegistry }) {
  const autonomyColors: Record<string, string> = {
    full: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    semi: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    reactive: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  return (
    <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">{agent.display_name}</h4>
            <p className="text-xs text-muted-foreground">{agent.agent_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={autonomyColors[agent.autonomy_level] || autonomyColors.semi}
          >
            {agent.autonomy_level}
          </Badge>
          {agent.is_active ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              Inactive
            </Badge>
          )}
        </div>
      </div>
      
      {agent.description && (
        <p className="text-sm text-muted-foreground mb-3">{agent.description}</p>
      )}

      <div className="flex flex-wrap gap-1">
        {agent.capabilities.slice(0, 4).map((capability) => (
          <Badge key={capability} variant="secondary" className="text-xs">
            {capability}
          </Badge>
        ))}
        {agent.capabilities.length > 4 && (
          <Badge variant="secondary" className="text-xs">
            +{agent.capabilities.length - 4} more
          </Badge>
        )}
      </div>
    </div>
  );
}

function DecisionItem({ decision }: { decision: AgentDecision }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-1.5 rounded-full ${
            decision.was_overridden 
              ? 'bg-amber-500/20 text-amber-500' 
              : 'bg-emerald-500/20 text-emerald-500'
          }`}>
            {decision.was_overridden ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{decision.decision_type}</span>
              <Badge variant="outline" className="text-xs">
                {decision.agent_name}
              </Badge>
              {decision.confidence_score && (
                <span className="text-xs text-muted-foreground">
                  {(decision.confidence_score * 100).toFixed(0)}% confidence
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {decision.decision_made}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(decision.created_at), { addSuffix: true })}
              </span>
              {decision.was_overridden && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500">
                  Overridden
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      {expanded && decision.reasoning && (
        <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
          <h5 className="font-medium mb-2">Reasoning</h5>
          <pre className="text-xs text-muted-foreground overflow-auto">
            {JSON.stringify(decision.reasoning, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
