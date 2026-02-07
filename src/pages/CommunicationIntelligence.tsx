import { useState } from 'react';
import { Brain, Activity, Workflow, RefreshCw, Filter, TrendingUp, AlertTriangle, Users, MessageSquare } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { PageTitle } from '@/components/ui/typography';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UnifiedCommunicationTimeline } from '@/components/communication/UnifiedCommunicationTimeline';
import { RelationshipHealthCard } from '@/components/communication/RelationshipHealthCard';
import { CrossChannelPatternAlert } from '@/components/communication/CrossChannelPatternAlert';
import { ClubAIAdvisorWidget } from '@/components/communication/ClubAIAdvisorWidget';
import { useUnifiedCommunications } from '@/hooks/useUnifiedCommunications';
import { useRelationshipHealth } from '@/hooks/useRelationshipHealth';
import { UnifiedImportDialog } from '@/components/communication/UnifiedImportDialog';
import { useCrossChannelPatterns } from '@/hooks/useCrossChannelPatterns';

export default function CommunicationIntelligence() {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const { communications, loading: commsLoading, refetch: refetchComms } = useUnifiedCommunications();
  const { relationships, stats, loading: healthLoading, refetch: refetchHealth } = useRelationshipHealth(
    entityFilter !== 'all' ? entityFilter : undefined
  );
  const { activeAlerts, loading: patternsLoading, analyzePatterns, resolvePattern } = useCrossChannelPatterns();

  const handleRefreshAll = () => {
    refetchComms();
    refetchHealth();
    analyzePatterns();
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <PageTitle>Communication Intelligence</PageTitle>
                <p className="text-sm text-muted-foreground">
                  Unified view of all communications with AI-powered insights
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="candidate">Candidates</SelectItem>
                  <SelectItem value="prospect">Prospects</SelectItem>
                  <SelectItem value="partner">Partners</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleRefreshAll}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <UnifiedImportDialog />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.healthy}</p>
                  <p className="text-xs text-muted-foreground">Healthy</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Activity className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.needsAttention}</p>
                  <p className="text-xs text-muted-foreground">Needs Attention</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.atRisk}</p>
                  <p className="text-xs text-muted-foreground">At Risk</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Active Alerts
                  <Badge variant="secondary">{activeAlerts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeAlerts.slice(0, 3).map(pattern => (
                  <CrossChannelPatternAlert
                    key={pattern.id}
                    pattern={pattern}
                    onResolve={() => resolvePattern(pattern.id)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          <Tabs defaultValue="timeline" className="space-y-4">
            <TabsList>
              <TabsTrigger value="timeline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-2">
                <Activity className="h-4 w-4" />
                Relationship Health
              </TabsTrigger>
              <TabsTrigger value="patterns" className="gap-2">
                <Workflow className="h-4 w-4" />
                Patterns
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Communication Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <UnifiedCommunicationTimeline
                    communications={communications}
                    loading={commsLoading}
                    maxHeight="500px"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {healthLoading ? (
                  Array(6).fill(0).map((_, i) => (
                    <div key={i} className="h-64 bg-muted/50 animate-pulse rounded-lg" />
                  ))
                ) : relationships.length === 0 ? (
                  <Card className="col-span-full border-dashed">
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No relationships tracked yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  relationships.map(rel => (
                    <RelationshipHealthCard key={rel.id} relationship={rel} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="patterns">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Detected Patterns</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => analyzePatterns()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Analyze Now
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patternsLoading ? (
                    <div className="h-32 bg-muted/50 animate-pulse rounded-lg" />
                  ) : activeAlerts.length === 0 ? (
                    <div className="py-8 text-center">
                      <Workflow className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No patterns detected</p>
                    </div>
                  ) : (
                    activeAlerts.map(pattern => (
                      <CrossChannelPatternAlert
                        key={pattern.id}
                        pattern={pattern}
                        onResolve={() => resolvePattern(pattern.id)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Club AI Advisor Widget */}
          <ClubAIAdvisorWidget context="general" />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
