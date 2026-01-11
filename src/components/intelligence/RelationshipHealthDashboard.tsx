import { useState } from 'react';
import { useRelationshipHealth, RiskFilter, RelationshipHealthItem } from '@/hooks/useRelationshipHealth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NetworkGraph } from '@/components/intelligence/NetworkGraph';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Clock,
  MessageSquare,
  RefreshCw,
  User,
  Building2,
  Users,
  Share2,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

const riskColors: Record<string, string> = {
  low: 'bg-green-500/10 text-green-600 border-green-200',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  high: 'bg-orange-500/10 text-orange-600 border-orange-200',
  critical: 'bg-red-500/10 text-red-600 border-red-200',
};

const trendIcons = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const trendColors: Record<string, string> = {
  improving: 'text-green-500',
  stable: 'text-muted-foreground',
  declining: 'text-red-500',
};

const entityIcons = {
  candidate: User,
  company: Building2,
  prospect: Users,
  internal: User,
  partner: Users,
  stakeholder: Users
};

export function RelationshipHealthDashboard() {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');

  const entityTypeFilter = entityFilter === 'all' ? undefined : entityFilter;
  const { relationships, loading, stats, refetch } = useRelationshipHealth(entityTypeFilter, riskFilter);

  const criticalRelationships = relationships.filter(r =>
    r.risk_level === 'critical' || r.risk_level === 'high'
  );

  const avgHealthScore = relationships.length > 0
    ? Math.round(relationships.reduce((sum, r) => sum + (r.health_score || 0), 0) / relationships.length)
    : 0;

  const decliningCount = relationships.filter(r => r.sentiment_trend === 'declining').length;

  const RelationshipCard = ({ relationship }: { relationship: RelationshipHealthItem }) => {
    const TrendIcon = trendIcons[relationship.sentiment_trend as keyof typeof trendIcons] || Minus;
    const EntityIcon = entityIcons[relationship.entity_type as keyof typeof entityIcons] || User;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              {relationship.entity_avatar ? (
                <img src={relationship.entity_avatar} alt={relationship.entity_name} className="h-full w-full object-cover" />
              ) : (
                <AvatarFallback className="bg-primary/10">
                  <EntityIcon className="h-5 w-5 text-primary" />
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate" title={relationship.entity_name || relationship.entity_id}>
                  {relationship.entity_name || 'Unknown'}
                  {relationship.entity_email && <span className="ml-1 text-muted-foreground font-normal text-xs">({relationship.entity_email})</span>}
                </span>
                <Badge variant="outline" className={cn("text-xs", riskColors[relationship.risk_level || 'low'])}>
                  {relationship.risk_level}
                </Badge>
                <TrendIcon className={cn("h-4 w-4 ml-auto", trendColors[relationship.sentiment_trend || 'stable'])} />
              </div>

              <p className="text-xs text-muted-foreground capitalize">{relationship.entity_type}</p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {relationship.days_since_contact ?? 0} days ago
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {relationship.total_communications ?? 0} comms
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Health Score</span>
                  <span className="text-xs font-medium">{relationship.health_score ?? 0}%</span>
                </div>
                <Progress value={relationship.health_score ?? 0} className="h-1.5" />
              </div>

              {relationship.recommended_action && (
                <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  💡 {relationship.recommended_action}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="graph" className="gap-2">
            <Share2 className="h-4 w-4" /> Network Graph
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Heart className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Relationships</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="h-6 w-6 mx-auto mb-2 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.healthy}</p>
                <p className="text-xs text-muted-foreground">Healthy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-6 w-6 mx-auto text-orange-500 mb-2" />
                <p className="text-2xl font-bold text-orange-600">{stats.atRisk}</p>
                <p className="text-xs text-muted-foreground">At Risk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingDown className="h-6 w-6 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold text-red-600">{decliningCount}</p>
                <p className="text-xs text-muted-foreground">Declining</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="h-6 w-6 mx-auto mb-2 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{avgHealthScore}</span>
                </div>
                <p className="text-2xl font-bold">{avgHealthScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Health</p>
              </CardContent>
            </Card>
          </div>

          {/* Critical Alerts */}
          {criticalRelationships.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Relationships Needing Attention ({criticalRelationships.length})
                </CardTitle>
                <CardDescription>
                  These relationships are at high or critical risk and need immediate outreach
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {criticalRelationships.slice(0, 6).map(r => (
                    <RelationshipCard key={r.id} relationship={r} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Relationships</CardTitle>
                  <CardDescription>
                    Track and manage relationship health across all entities
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Entity Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="candidate">Candidates</SelectItem>
                      <SelectItem value="company">Companies</SelectItem>
                      <SelectItem value="prospect">Prospects</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="partner">Partners</SelectItem>
                      <SelectItem value="stakeholder">Stakeholders</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskFilter)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : relationships.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No relationships found matching your filters
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {relationships.map(r => (
                      <RelationshipCard key={r.id} relationship={r} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graph" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <NetworkGraph />
        </TabsContent>
      </Tabs>
    </div>
  );
}
