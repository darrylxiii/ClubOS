import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Timer, Gauge, TrendingDown } from 'lucide-react';

interface PollingHook {
  name: string;
  file: string;
  currentInterval: number;
  optimizedInterval: number;
  category: string;
}

// Static registry of all polling hooks and their optimized values
const POLLING_HOOKS: PollingHook[] = [
  // 3s → 15s
  { name: 'MusicPlayerPanel (live session)', file: 'MusicPlayerPanel.tsx', currentInterval: 3000, optimizedInterval: 15000, category: 'Music' },
  // 5s → 30s
  { name: 'DJMixer (queue)', file: 'DJMixer.tsx', currentInterval: 5000, optimizedInterval: 30000, category: 'Music' },
  { name: 'MusicPlayer (live session)', file: 'MusicPlayer.tsx', currentInterval: 5000, optimizedInterval: 30000, category: 'Music' },
  { name: 'RealTimeActivityTab', file: 'RealTimeActivityTab.tsx', currentInterval: 5000, optimizedInterval: 30000, category: 'Admin' },
  { name: 'IntelligenceDashboard', file: 'IntelligenceDashboard.tsx', currentInterval: 5000, optimizedInterval: 30000, category: 'Admin' },
  { name: 'BulkOperationHistory', file: 'BulkOperationHistory.tsx', currentInterval: 5000, optimizedInterval: 30000, category: 'Admin' },
  // 30s → 60s
  { name: 'SystemHealth', file: 'useSystemHealth.ts', currentInterval: 30000, optimizedInterval: 60000, category: 'Infrastructure' },
  { name: 'ThreatDetection', file: 'useThreatDetection.ts', currentInterval: 30000, optimizedInterval: 60000, category: 'Security' },
  { name: 'AnomalyAlerts', file: 'useAnomalyAlerts.ts', currentInterval: 30000, optimizedInterval: 60000, category: 'Security' },
  { name: 'SessionSecurity', file: 'useSessionSecurity.ts', currentInterval: 30000, optimizedInterval: 60000, category: 'Security' },
  { name: 'RateLimitDashboard', file: 'RateLimitDashboard.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Security' },
  { name: 'ComplianceMetrics', file: 'ComplianceMetrics.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Compliance' },
  { name: 'DisasterRecovery (alerts)', file: 'DisasterRecoveryDashboard.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Infrastructure' },
  { name: 'ErrorLogViewer', file: 'ErrorLogViewer.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Infrastructure' },
  { name: 'SecurityIncidents', file: 'SecurityIncidentsPanel.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Security' },
  { name: 'FeatureAnalytics', file: 'FeatureAnalyticsTab.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Admin' },
  { name: 'FrustrationSignals', file: 'FrustrationSignalsTab.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Admin' },
  { name: 'CommunicationAudit', file: 'useCommunicationAudit.ts', currentInterval: 30000, optimizedInterval: 60000, category: 'Communication' },
  { name: 'WhatsAppHub (unread)', file: 'WhatsAppHub.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Communication' },
  { name: 'CampaignPerformance', file: 'useCampaignPerformance.ts', currentInterval: 30000, optimizedInterval: 60000, category: 'CRM' },
  { name: 'SLAStatusPanel', file: 'SLAStatusPanel.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Admin' },
  { name: 'AgentActivityFeed', file: 'AgentActivityFeed.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Agent' },
  { name: 'WebhookReliability', file: 'WebhookReliabilityDashboard.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Infrastructure' },
  { name: 'UserSegmentsTab', file: 'UserSegmentsTab.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Admin' },
  { name: 'AdminIntelligenceTab', file: 'AdminIntelligenceTab.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Admin' },
  { name: 'CandidateIntelligence', file: 'CandidateIntelligenceTab.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Admin' },
  { name: 'ProjectMessages', file: 'useProjectMessages.ts', currentInterval: 30000, optimizedInterval: 60000, category: 'Communication' },
  { name: 'UnreadMessages', file: 'UnreadMessagesWidget.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Communication' },
  { name: 'UserActivity', file: 'UserActivity.tsx', currentInterval: 30000, optimizedInterval: 60000, category: 'Admin' },
];

export function PollingConfigTab() {
  const totalCurrentReqs = POLLING_HOOKS.reduce((s, h) => s + (60000 / h.currentInterval), 0);
  const totalOptimizedReqs = POLLING_HOOKS.reduce((s, h) => s + (60000 / h.optimizedInterval), 0);
  const reductionPercent = Math.round(((totalCurrentReqs - totalOptimizedReqs) / totalCurrentReqs) * 100);
  const monthlyCurrentReqs = Math.round(totalCurrentReqs * 60 * 24 * 30);
  const monthlyOptimizedReqs = Math.round(totalOptimizedReqs * 60 * 24 * 30);
  const monthlySaved = monthlyCurrentReqs - monthlyOptimizedReqs;

  const categories = [...new Set(POLLING_HOOKS.map(h => h.category))].sort();

  return (
    <div className="space-y-6">
      {/* Savings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Polling Hooks</p>
                <p className="text-2xl font-bold">{POLLING_HOOKS.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingDown className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reduction</p>
                <p className="text-2xl font-bold text-green-500">{reductionPercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Gauge className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Saved</p>
                <p className="text-2xl font-bold">{(monthlySaved / 1000000).toFixed(1)}M reqs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Note */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-sm">
            <strong>Optimizations applied.</strong> All polling intervals have been increased to optimized values, and{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">refetchIntervalInBackground: false</code> has been added to prevent background tab polling.
            These changes are silent — no user-facing impact.
          </p>
        </CardContent>
      </Card>

      {/* Per-Category Breakdown */}
      {categories.map(cat => {
        const hooks = POLLING_HOOKS.filter(h => h.category === cat);
        return (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge variant="outline">{cat}</Badge>
                <span className="text-muted-foreground font-normal">{hooks.length} hooks</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-3 font-medium">Hook</th>
                    <th className="p-3 font-medium">File</th>
                    <th className="p-3 font-medium text-right">Previous</th>
                    <th className="p-3 font-medium text-right">Current</th>
                    <th className="p-3 font-medium text-right">Reduction</th>
                  </tr>
                </thead>
                <tbody>
                  {hooks.map(h => {
                    const reduction = Math.round(((h.currentInterval - h.optimizedInterval) / h.currentInterval) * 100);
                    return (
                      <tr key={h.name} className="border-b last:border-0">
                        <td className="p-3 font-medium">{h.name}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{h.file}</td>
                        <td className="p-3 text-right font-mono text-xs line-through text-muted-foreground">{h.currentInterval / 1000}s</td>
                        <td className="p-3 text-right font-mono text-xs text-green-500">{h.optimizedInterval / 1000}s</td>
                        <td className="p-3 text-right">
                          <Badge variant="secondary" className="text-xs">{reduction > 0 ? `-${reduction}%` : '—'}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
