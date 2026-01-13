import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Shield, AlertTriangle, Ban, BarChart3, Globe, Monitor, Settings, History, Download } from 'lucide-react';
import { ThreatOverview } from './ThreatOverview';
import { ActiveThreatsPanel } from './ActiveThreatsPanel';
import { Suspense, lazy } from 'react';
import { useThreatRealtimeSubscription, useRunThreatScan, useThreatSummary } from '@/hooks/useThreatDetection';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load non-critical tabs
const AttackMap = lazy(() => import('./AttackMap').then(module => ({ default: module.AttackMap })));
const BlockedIPsManager = lazy(() => import('./BlockedIPsManager').then(module => ({ default: module.BlockedIPsManager })));
const ThreatAnalytics = lazy(() => import('./ThreatAnalytics').then(module => ({ default: module.ThreatAnalytics })));
const SessionSecurityPanel = lazy(() => import('./SessionSecurityPanel').then(module => ({ default: module.SessionSecurityPanel })));
const SecurityControlsPanel = lazy(() => import('./SecurityControlsPanel').then(module => ({ default: module.SecurityControlsPanel })));
const ThreatHistory = lazy(() => import('./ThreatHistory').then(module => ({ default: module.ThreatHistory })));

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

      <Tabs defaultValue="threats" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="threats" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Active Threats
          </TabsTrigger>
          <TabsTrigger
            value="map"
            className="flex items-center gap-2"
            onMouseEnter={() => {
              // Prefetch the component
              import('./AttackMap');
            }}
          >
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
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex items-center gap-2"
            onMouseEnter={() => {
              import('./ThreatAnalytics');
            }}
          >
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
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <AttackMap />
          </Suspense>
        </TabsContent>

        <TabsContent value="sessions">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <SessionSecurityPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="blocked">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <BlockedIPsManager />
          </Suspense>
        </TabsContent>

        <TabsContent value="history">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <ThreatHistory />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <ThreatAnalytics />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <SecurityControlsPanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
