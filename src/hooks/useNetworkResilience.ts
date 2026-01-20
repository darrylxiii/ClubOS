import { useState, useCallback, useRef, useEffect } from 'react';

interface NetworkStats {
  timestamp: number;
  rtt: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
}

interface NetworkHistory {
  stats: NetworkStats[];
  avgRtt: number;
  avgJitter: number;
  avgPacketLoss: number;
  avgBandwidth: number;
  trend: 'improving' | 'stable' | 'degrading';
}

interface ConnectionState {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastDisconnect: number | null;
  lastReconnect: number | null;
}

interface UseNetworkResilienceReturn {
  currentStats: NetworkStats | null;
  history: NetworkHistory;
  connectionState: ConnectionState;
  recordStats: (peerConnection: RTCPeerConnection) => Promise<void>;
  getStatusColor: () => string;
  getStatusLabel: () => string;
  exportReport: () => NetworkReport;
  clearHistory: () => void;
}

interface NetworkReport {
  sessionDuration: number;
  averageQuality: string;
  totalDisconnects: number;
  avgReconnectTime: number;
  stats: {
    rtt: { min: number; max: number; avg: number };
    packetLoss: { min: number; max: number; avg: number };
    bandwidth: { min: number; max: number; avg: number };
  };
  timeline: Array<{ timestamp: number; status: string }>;
}

const MAX_HISTORY_SIZE = 300; // 5 minutes at 1 sample/second
const TREND_WINDOW = 30;      // 30 samples for trend calculation

export function useNetworkResilience(): UseNetworkResilienceReturn {
  const [currentStats, setCurrentStats] = useState<NetworkStats | null>(null);
  const [history, setHistory] = useState<NetworkHistory>({
    stats: [],
    avgRtt: 0,
    avgJitter: 0,
    avgPacketLoss: 0,
    avgBandwidth: 0,
    trend: 'stable',
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'excellent',
    isReconnecting: false,
    reconnectAttempts: 0,
    lastDisconnect: null,
    lastReconnect: null,
  });

  const previousStatsRef = useRef<RTCStatsReport | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const disconnectCountRef = useRef<number>(0);
  const reconnectTimesRef = useRef<number[]>([]);
  const timelineRef = useRef<Array<{ timestamp: number; status: string }>>([]);

  const calculateTrend = useCallback((stats: NetworkStats[]): 'improving' | 'stable' | 'degrading' => {
    if (stats.length < TREND_WINDOW) return 'stable';
    
    const recent = stats.slice(-TREND_WINDOW);
    const firstHalf = recent.slice(0, TREND_WINDOW / 2);
    const secondHalf = recent.slice(TREND_WINDOW / 2);
    
    const firstAvgRtt = firstHalf.reduce((sum, s) => sum + s.rtt, 0) / firstHalf.length;
    const secondAvgRtt = secondHalf.reduce((sum, s) => sum + s.rtt, 0) / secondHalf.length;
    
    const firstAvgLoss = firstHalf.reduce((sum, s) => sum + s.packetLoss, 0) / firstHalf.length;
    const secondAvgLoss = secondHalf.reduce((sum, s) => sum + s.packetLoss, 0) / secondHalf.length;
    
    const rttChange = (secondAvgRtt - firstAvgRtt) / firstAvgRtt;
    const lossChange = secondAvgLoss - firstAvgLoss;
    
    if (rttChange < -0.1 && lossChange < -0.01) return 'improving';
    if (rttChange > 0.2 || lossChange > 0.02) return 'degrading';
    return 'stable';
  }, []);

  const determineStatus = useCallback((stats: NetworkStats): ConnectionState['status'] => {
    if (stats.packetLoss > 0.15 || stats.rtt > 500) return 'poor';
    if (stats.packetLoss > 0.08 || stats.rtt > 300) return 'fair';
    if (stats.packetLoss > 0.03 || stats.rtt > 150) return 'good';
    return 'excellent';
  }, []);

  const recordStats = useCallback(async (peerConnection: RTCPeerConnection): Promise<void> => {
    try {
      const stats = await peerConnection.getStats();
      const now = Date.now();
      
      let rtt = 0;
      let jitter = 0;
      let packetsReceived = 0;
      let packetsSent = 0;
      let packetsLost = 0;
      let bytesReceived = 0;
      let bytesSent = 0;
      let bandwidth = 0;

      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
          bandwidth = report.availableOutgoingBitrate || 0;
        }
        
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetsReceived = report.packetsReceived || 0;
          packetsLost = report.packetsLost || 0;
          bytesReceived = report.bytesReceived || 0;
          jitter = report.jitter ? report.jitter * 1000 : 0;
        }
        
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          packetsSent = report.packetsSent || 0;
          bytesSent = report.bytesSent || 0;
        }
      });

      const totalPackets = packetsReceived + packetsLost;
      const packetLoss = totalPackets > 0 ? packetsLost / totalPackets : 0;

      const newStats: NetworkStats = {
        timestamp: now,
        rtt,
        jitter,
        packetLoss,
        bandwidth,
        bytesReceived,
        bytesSent,
        packetsReceived,
        packetsSent,
      };

      setCurrentStats(newStats);

      setHistory(prev => {
        const updatedStats = [...prev.stats, newStats].slice(-MAX_HISTORY_SIZE);
        
        const avgRtt = updatedStats.reduce((sum, s) => sum + s.rtt, 0) / updatedStats.length;
        const avgJitter = updatedStats.reduce((sum, s) => sum + s.jitter, 0) / updatedStats.length;
        const avgPacketLoss = updatedStats.reduce((sum, s) => sum + s.packetLoss, 0) / updatedStats.length;
        const avgBandwidth = updatedStats.reduce((sum, s) => sum + s.bandwidth, 0) / updatedStats.length;
        const trend = calculateTrend(updatedStats);

        return {
          stats: updatedStats,
          avgRtt,
          avgJitter,
          avgPacketLoss,
          avgBandwidth,
          trend,
        };
      });

      const status = determineStatus(newStats);
      setConnectionState(prev => {
        if (status !== prev.status) {
          timelineRef.current.push({ timestamp: now, status });
        }
        return { ...prev, status };
      });

      previousStatsRef.current = stats;
    } catch (error) {
      console.error('Failed to record network stats:', error);
    }
  }, [calculateTrend, determineStatus]);

  const getStatusColor = useCallback((): string => {
    switch (connectionState.status) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-emerald-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      case 'disconnected': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  }, [connectionState.status]);

  const getStatusLabel = useCallback((): string => {
    const labels: Record<ConnectionState['status'], string> = {
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      disconnected: 'Disconnected',
    };
    return labels[connectionState.status];
  }, [connectionState.status]);

  const exportReport = useCallback((): NetworkReport => {
    const stats = history.stats;
    if (stats.length === 0) {
      return {
        sessionDuration: Date.now() - sessionStartRef.current,
        averageQuality: 'unknown',
        totalDisconnects: disconnectCountRef.current,
        avgReconnectTime: 0,
        stats: {
          rtt: { min: 0, max: 0, avg: 0 },
          packetLoss: { min: 0, max: 0, avg: 0 },
          bandwidth: { min: 0, max: 0, avg: 0 },
        },
        timeline: timelineRef.current,
      };
    }

    const rttValues = stats.map(s => s.rtt);
    const lossValues = stats.map(s => s.packetLoss);
    const bwValues = stats.map(s => s.bandwidth);

    const avgReconnectTime = reconnectTimesRef.current.length > 0
      ? reconnectTimesRef.current.reduce((a, b) => a + b, 0) / reconnectTimesRef.current.length
      : 0;

    // Determine average quality
    const avgLoss = history.avgPacketLoss;
    const avgRtt = history.avgRtt;
    let averageQuality = 'excellent';
    if (avgLoss > 0.1 || avgRtt > 400) averageQuality = 'poor';
    else if (avgLoss > 0.05 || avgRtt > 250) averageQuality = 'fair';
    else if (avgLoss > 0.02 || avgRtt > 100) averageQuality = 'good';

    return {
      sessionDuration: Date.now() - sessionStartRef.current,
      averageQuality,
      totalDisconnects: disconnectCountRef.current,
      avgReconnectTime,
      stats: {
        rtt: {
          min: Math.min(...rttValues),
          max: Math.max(...rttValues),
          avg: history.avgRtt,
        },
        packetLoss: {
          min: Math.min(...lossValues),
          max: Math.max(...lossValues),
          avg: history.avgPacketLoss,
        },
        bandwidth: {
          min: Math.min(...bwValues),
          max: Math.max(...bwValues),
          avg: history.avgBandwidth,
        },
      },
      timeline: timelineRef.current,
    };
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory({
      stats: [],
      avgRtt: 0,
      avgJitter: 0,
      avgPacketLoss: 0,
      avgBandwidth: 0,
      trend: 'stable',
    });
    setCurrentStats(null);
    previousStatsRef.current = null;
    sessionStartRef.current = Date.now();
    disconnectCountRef.current = 0;
    reconnectTimesRef.current = [];
    timelineRef.current = [];
  }, []);

  return {
    currentStats,
    history,
    connectionState,
    recordStats,
    getStatusColor,
    getStatusLabel,
    exportReport,
    clearHistory,
  };
}
