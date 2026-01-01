import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Wifi, 
  Brain, 
  BarChart3,
  Settings2,
  Gauge,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { PerformanceDashboard } from '@/components/meetings/PerformanceDashboard';
import { NetworkDashboard } from '@/components/meetings/NetworkDashboard';
import { MeetingAnalyticsDashboard } from '@/components/meetings/MeetingAnalyticsDashboard';
import { MeetingSettingsPanel } from '@/components/meetings/MeetingSettingsPanel';

interface MeetingDashboardModalsProps {
  isPerformanceOpen: boolean;
  isNetworkOpen: boolean;
  isAnalyticsOpen: boolean;
  isSettingsOpen: boolean;
  onClosePerformance: () => void;
  onCloseNetwork: () => void;
  onCloseAnalytics: () => void;
  onCloseSettings: () => void;
  // Data from useMasterMeeting
  performance?: {
    fps: number;
    cpuUsage: number;
    memoryUsage: number;
    alerts: Array<{ type: string; message: string }>;
  };
  network?: {
    latency: number;
    packetLoss: number;
    bandwidth: number;
    connectionState: string;
  };
  analytics?: {
    participantStats: Map<string, any>;
    meetingMetrics: any;
    timeline: any[];
  };
  settings?: {
    current: any;
    update: (category: string, updates: any) => void;
    toggle: (category: string, enabled: boolean) => void;
  };
  onReconnect?: () => void;
}

export function MeetingDashboardModals({
  isPerformanceOpen,
  isNetworkOpen,
  isAnalyticsOpen,
  isSettingsOpen,
  onClosePerformance,
  onCloseNetwork,
  onCloseAnalytics,
  onCloseSettings,
  performance,
  network,
  analytics,
  settings,
  onReconnect
}: MeetingDashboardModalsProps) {
  return (
    <>
      {/* Performance Dashboard Modal */}
      <Dialog open={isPerformanceOpen} onOpenChange={onClosePerformance}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" />
              Performance Monitor
            </DialogTitle>
          </DialogHeader>
          <PerformanceDashboard />
        </DialogContent>
      </Dialog>

      {/* Network Dashboard Modal */}
      <Dialog open={isNetworkOpen} onOpenChange={onCloseNetwork}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              Network Status
            </DialogTitle>
          </DialogHeader>
          <NetworkDashboard />
        </DialogContent>
      </Dialog>

      {/* Analytics Dashboard Modal */}
      <Dialog open={isAnalyticsOpen} onOpenChange={onCloseAnalytics}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Meeting Analytics
            </DialogTitle>
          </DialogHeader>
          <MeetingAnalyticsDashboard />
        </DialogContent>
      </Dialog>

      {/* Settings Panel Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={onCloseSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Meeting Settings
            </DialogTitle>
          </DialogHeader>
          <MeetingSettingsPanel />
        </DialogContent>
      </Dialog>
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
