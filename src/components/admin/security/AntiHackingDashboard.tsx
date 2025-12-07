import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Shield, AlertTriangle, Ban, BarChart3, Globe, Monitor, Settings, History, Download } from 'lucide-react';
import { ThreatOverview } from './ThreatOverview';
import { ActiveThreatsPanel } from './ActiveThreatsPanel';
import { BlockedIPsManager } from './BlockedIPsManager';
import { ThreatAnalytics } from './ThreatAnalytics';
import { AttackMap } from './AttackMap';
import { SessionSecurityPanel } from './SessionSecurityPanel';
import { SecurityControlsPanel } from './SecurityControlsPanel';
import { ThreatHistory } from './ThreatHistory';
import { useThreatRealtimeSubscription, useRunThreatScan, useThreatSummary } from '@/hooks/useThreatDetection';
import { format } from 'date-fns';

export function AntiHackingDashboard() {
  useThreatRealtimeSubscription();
  const runScan = useRunThreatScan();
  const { data: summary } = useThreatSummary();

  const totalActiveThreats = (summary?.critical_threats || 0) + (summary?.high_threats || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Anti-Hacking Command Center
            {totalActiveThreats > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalActiveThreats} Active Threats
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            Real-time threat detection, monitoring, and response • Last scan: {summary ? format(new Date(), 'HH:mm:ss') : 'N/A'}
          </p>
        </div>
        <Button 
          onClick={() => runScan.mutate()} 
          disabled={runScan.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${runScan.isPending ? 'animate-spin' : ''}`} />
          Run Threat Scan
        </Button>
      </div>

      {/* Threat Overview */}
      <ThreatOverview />

      {/* Main Content Tabs */}
      <Tabs defaultValue="threats" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="threats" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Active Threats
            {totalActiveThreats > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center text-xs">
                {totalActiveThreats}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Attack Map
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="blocked" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Blocked IPs
            {(summary?.blocked_ips_active || 0) > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {summary?.blocked_ips_active}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="threats">
          <ActiveThreatsPanel />
        </TabsContent>

        <TabsContent value="map">
          <AttackMap />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionSecurityPanel />
        </TabsContent>

        <TabsContent value="blocked">
          <BlockedIPsManager />
        </TabsContent>

        <TabsContent value="history">
          <ThreatHistory />
        </TabsContent>

        <TabsContent value="analytics">
          <ThreatAnalytics />
        </TabsContent>

        <TabsContent value="settings">
          <SecurityControlsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
