import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Shield, AlertTriangle, Ban, BarChart3, Settings } from 'lucide-react';
import { ThreatOverview } from './ThreatOverview';
import { ActiveThreatsPanel } from './ActiveThreatsPanel';
import { BlockedIPsManager } from './BlockedIPsManager';
import { ThreatAnalytics } from './ThreatAnalytics';
import { useThreatRealtimeSubscription, useRunThreatScan } from '@/hooks/useThreatDetection';

export function AntiHackingDashboard() {
  useThreatRealtimeSubscription();
  const runScan = useRunThreatScan();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Anti-Hacking Command Center
          </h2>
          <p className="text-muted-foreground">
            Real-time threat detection, monitoring, and response
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
        <TabsList>
          <TabsTrigger value="threats" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Active Threats
          </TabsTrigger>
          <TabsTrigger value="blocked" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Blocked IPs
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="threats">
          <ActiveThreatsPanel />
        </TabsContent>

        <TabsContent value="blocked">
          <BlockedIPsManager />
        </TabsContent>

        <TabsContent value="analytics">
          <ThreatAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
