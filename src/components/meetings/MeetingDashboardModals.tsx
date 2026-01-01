import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PerformanceDashboard } from './PerformanceDashboard';
import { NetworkDashboard } from './NetworkDashboard';
import { MeetingAnalyticsDashboard } from './MeetingAnalyticsDashboard';
import { MeetingSettingsPanel } from './MeetingSettingsPanel';
import { Activity, Wifi, BarChart3, Settings, AlertTriangle, Brain, Gauge, Settings2 } from 'lucide-react';
import type { MeetingFeatureSettings } from '@/hooks/useMeetingFeatureSettings';

interface MeetingDashboardModalsProps {
  // Network data
  networkStats?: {
    timestamp: number;
    rtt: number;
    jitter: number;
    packetLoss: number;
    bandwidth: number;
  } | null;
  networkHistory?: {
    stats: Array<{ timestamp: number; rtt: number; jitter: number; packetLoss: number; bandwidth: number }>;
    avgRtt: number;
    avgJitter: number;
    avgPacketLoss: number;
    avgBandwidth: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  connectionState?: {
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
    isReconnecting: boolean;
    reconnectAttempts: number;
  };
  // Settings
  settings?: MeetingFeatureSettings;
  onUpdateSetting?: <K extends keyof MeetingFeatureSettings>(
    category: K,
    updates: Partial<MeetingFeatureSettings[K]>
  ) => void;
  onToggleFeature?: (category: keyof MeetingFeatureSettings, enabled: boolean) => void;
  onResetSettings?: () => void;
  capabilities?: {
    canUseFeature: (feature: string) => boolean;
    unsupported: string[];
  };
}

export function MeetingDashboardModals({
  networkStats,
  networkHistory,
  connectionState,
  settings,
  onUpdateSetting,
  onToggleFeature,
  onResetSettings,
  capabilities,
}: MeetingDashboardModalsProps) {
  const [showPerformance, setShowPerformance] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleExportNetworkReport = useCallback(() => {
    if (!networkHistory) return;
    const report = JSON.stringify(networkHistory, null, 2);
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [networkHistory]);

  const handleClearNetworkHistory = useCallback(() => {
    console.log('Clear network history requested');
  }, []);

  const defaultNetworkHistory = {
    stats: [],
    avgRtt: 0,
    avgJitter: 0,
    avgPacketLoss: 0,
    avgBandwidth: 0,
    trend: 'stable' as const,
  };

  const defaultConnectionState = {
    status: 'good' as const,
    isReconnecting: false,
    reconnectAttempts: 0,
  };

  return (
    <>
      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPerformance(true)}
          className="gap-2"
        >
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Performance</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowNetwork(true)}
          className="gap-2"
        >
          <Wifi className="h-4 w-4" />
          <span className="hidden sm:inline">Network</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAnalytics(true)}
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Insights</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </div>

      {/* Performance Dashboard Modal */}
      <Dialog open={showPerformance} onOpenChange={setShowPerformance}>
        <DialogContent className="max-w-2xl z-[10100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Dashboard
            </DialogTitle>
          </DialogHeader>
          <PerformanceDashboard />
        </DialogContent>
      </Dialog>

      {/* Network Dashboard Modal */}
      <Dialog open={showNetwork} onOpenChange={setShowNetwork}>
        <DialogContent className="max-w-2xl z-[10100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Network Dashboard
            </DialogTitle>
          </DialogHeader>
          <NetworkDashboard
            currentStats={networkStats ?? null}
            history={networkHistory ?? defaultNetworkHistory}
            connectionState={connectionState ?? defaultConnectionState}
            onExportReport={handleExportNetworkReport}
            onClearHistory={handleClearNetworkHistory}
          />
        </DialogContent>
      </Dialog>

      {/* Analytics Dashboard Modal */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[10100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Meeting Insights
            </DialogTitle>
          </DialogHeader>
          <MeetingAnalyticsDashboard />
        </DialogContent>
      </Dialog>

      {/* Settings Panel */}
      {settings && onUpdateSetting && onToggleFeature && onResetSettings && capabilities && (
        <MeetingSettingsPanel
          open={showSettings}
          onOpenChange={setShowSettings}
          settings={settings}
          onUpdateSetting={onUpdateSetting}
          onToggleFeature={onToggleFeature}
          onReset={onResetSettings}
          capabilities={capabilities}
        />
      )}
    </>
  );
}

// Quick status badges for the meeting controls bar
interface MeetingStatusBadgesProps {
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isRecording: boolean;
  isTranscribing: boolean;
  hasAlerts: boolean;
  onNetworkClick: () => void;
  onPerformanceClick: () => void;
}

export function MeetingStatusBadges({
  networkQuality,
  isRecording,
  isTranscribing,
  hasAlerts,
  onNetworkClick,
  onPerformanceClick
}: MeetingStatusBadgesProps) {
  const qualityColors = {
    excellent: 'bg-green-500',
    good: 'bg-green-400',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500'
  };

  return (
    <div className="flex items-center gap-2">
      {/* Network Quality Indicator */}
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-1.5 h-7 px-2"
        onClick={onNetworkClick}
      >
        <Wifi className={`w-3.5 h-3.5 ${
          networkQuality === 'poor' ? 'text-destructive' : 
          networkQuality === 'fair' ? 'text-yellow-500' : 
          'text-green-500'
        }`} />
        <span className="text-xs capitalize">{networkQuality}</span>
      </Button>

      {/* Performance/Alerts Indicator */}
      {hasAlerts && (
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 h-7 px-2 text-yellow-500"
          onClick={onPerformanceClick}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-xs">Alert</span>
        </Button>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 rounded-md">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs text-destructive font-medium">REC</span>
        </div>
      )}

      {/* Transcription Indicator */}
      {isTranscribing && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">AI</span>
        </div>
      )}
    </div>
  );
}

// Dashboard control buttons for the meeting toolbar
interface DashboardControlButtonsProps {
  onOpenPerformance: () => void;
  onOpenNetwork: () => void;
  onOpenAnalytics: () => void;
  onOpenSettings: () => void;
  isHost?: boolean;
}

export function DashboardControlButtons({
  onOpenPerformance,
  onOpenNetwork,
  onOpenAnalytics,
  onOpenSettings,
  isHost = false
}: DashboardControlButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onOpenPerformance}
        title="Performance Monitor"
      >
        <Gauge className="w-4 h-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onOpenNetwork}
        title="Network Status"
      >
        <Wifi className="w-4 h-4" />
      </Button>
      
      {isHost && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onOpenAnalytics}
          title="Meeting Analytics"
        >
          <BarChart3 className="w-4 h-4" />
        </Button>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onOpenSettings}
        title="Meeting Settings"
      >
        <Settings2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
