import { useState, useEffect, useCallback, useRef } from 'react';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

export interface ConnectionStats {
  quality: ConnectionQuality;
  packetLoss: number;
  latency: number;
  jitter: number;
  bitrate: number;
  timestamp: number;
}

interface UseConnectionQualityProps {
  peerConnection: RTCPeerConnection | null;
  enabled: boolean;
  onQualityChange?: (quality: ConnectionQuality) => void;
}

// Quality thresholds based on Discord's observed behavior
const QUALITY_THRESHOLDS = {
  excellent: { packetLoss: 1, latency: 50, jitter: 10 },
  good: { packetLoss: 3, latency: 150, jitter: 30 },
  fair: { packetLoss: 5, latency: 300, jitter: 50 },
  poor: { packetLoss: 100, latency: 1000, jitter: 100 }
};

export function useConnectionQuality({ 
  peerConnection, 
  enabled,
  onQualityChange 
}: UseConnectionQualityProps) {
  const [stats, setStats] = useState<ConnectionStats>({
    quality: 'disconnected',
    packetLoss: 0,
    latency: 0,
    jitter: 0,
    bitrate: 0,
    timestamp: Date.now()
  });

  const [qualityHistory, setQualityHistory] = useState<ConnectionQuality[]>([]);
  const previousStatsRef = useRef<{
    packetsReceived: number;
    packetsLost: number;
    bytesReceived: number;
    timestamp: number;
  } | null>(null);
  
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastQualityRef = useRef<ConnectionQuality>('disconnected');

  const calculateQuality = useCallback((packetLoss: number, latency: number, jitter: number): ConnectionQuality => {
    if (packetLoss <= QUALITY_THRESHOLDS.excellent.packetLoss && 
        latency <= QUALITY_THRESHOLDS.excellent.latency &&
        jitter <= QUALITY_THRESHOLDS.excellent.jitter) {
      return 'excellent';
    }
    if (packetLoss <= QUALITY_THRESHOLDS.good.packetLoss && 
        latency <= QUALITY_THRESHOLDS.good.latency &&
        jitter <= QUALITY_THRESHOLDS.good.jitter) {
      return 'good';
    }
    if (packetLoss <= QUALITY_THRESHOLDS.fair.packetLoss && 
        latency <= QUALITY_THRESHOLDS.fair.latency &&
        jitter <= QUALITY_THRESHOLDS.fair.jitter) {
      return 'fair';
    }
    return 'poor';
  }, []);

  const collectStats = useCallback(async () => {
    if (!peerConnection || peerConnection.connectionState === 'closed') {
      setStats(prev => ({ ...prev, quality: 'disconnected' }));
      return;
    }

    try {
      const rtcStats = await peerConnection.getStats();
      let currentPacketsReceived = 0;
      let currentPacketsLost = 0;
      let currentBytesReceived = 0;
      let latency = 0;
      let jitter = 0;

      rtcStats.forEach(report => {
        // Inbound RTP stats (audio receiving)
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          currentPacketsReceived += report.packetsReceived || 0;
          currentPacketsLost += report.packetsLost || 0;
          jitter = Math.max(jitter, (report.jitter || 0) * 1000); // Convert to ms
        }

        // Candidate pair for RTT
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          latency = (report.currentRoundTripTime || 0) * 1000; // Convert to ms
        }

        // Transport stats for bytes
        if (report.type === 'transport') {
          currentBytesReceived = report.bytesReceived || 0;
        }
      });

      const now = Date.now();
      let packetLoss = 0;
      let bitrate = 0;

      if (previousStatsRef.current) {
        const timeDiff = (now - previousStatsRef.current.timestamp) / 1000; // seconds
        
        const newPacketsReceived = currentPacketsReceived - previousStatsRef.current.packetsReceived;
        const newPacketsLost = currentPacketsLost - previousStatsRef.current.packetsLost;
        const totalNewPackets = newPacketsReceived + newPacketsLost;
        
        if (totalNewPackets > 0) {
          packetLoss = (newPacketsLost / totalNewPackets) * 100;
        }

        const bytesDiff = currentBytesReceived - previousStatsRef.current.bytesReceived;
        bitrate = (bytesDiff * 8) / timeDiff / 1000; // kbps
      }

      previousStatsRef.current = {
        packetsReceived: currentPacketsReceived,
        packetsLost: currentPacketsLost,
        bytesReceived: currentBytesReceived,
        timestamp: now
      };

      const quality = calculateQuality(packetLoss, latency, jitter);

      // Track quality history (last 5 readings for smoothing)
      setQualityHistory(prev => {
        const newHistory = [...prev, quality].slice(-5);
        return newHistory;
      });

      // Notify on quality change
      if (quality !== lastQualityRef.current) {
        lastQualityRef.current = quality;
        onQualityChange?.(quality);
        
        // Log significant quality changes
        if (quality === 'poor' || quality === 'fair') {
          console.warn('[ConnectionQuality] Quality degraded:', {
            quality,
            packetLoss: packetLoss.toFixed(1) + '%',
            latency: latency.toFixed(0) + 'ms',
            jitter: jitter.toFixed(0) + 'ms'
          });
        }
      }

      setStats({
        quality,
        packetLoss,
        latency,
        jitter,
        bitrate,
        timestamp: now
      });

    } catch (error) {
      console.error('[ConnectionQuality] Error collecting stats:', error);
    }
  }, [peerConnection, calculateQuality, onQualityChange]);

  // Start/stop monitoring based on enabled state
  useEffect(() => {
    if (enabled && peerConnection) {
      // Monitor every 2 seconds (Discord-like frequency)
      monitorIntervalRef.current = setInterval(collectStats, 2000);
      
      // Initial collection
      collectStats();
    }

    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
  }, [enabled, peerConnection, collectStats]);

  // Get average quality from history (smoothed)
  const getSmoothedQuality = useCallback((): ConnectionQuality => {
    if (qualityHistory.length === 0) return stats.quality;
    
    const qualityScores: Record<ConnectionQuality, number> = {
      'excellent': 4,
      'good': 3,
      'fair': 2,
      'poor': 1,
      'disconnected': 0
    };
    
    const avgScore = qualityHistory.reduce((sum, q) => sum + qualityScores[q], 0) / qualityHistory.length;
    
    if (avgScore >= 3.5) return 'excellent';
    if (avgScore >= 2.5) return 'good';
    if (avgScore >= 1.5) return 'fair';
    if (avgScore >= 0.5) return 'poor';
    return 'disconnected';
  }, [qualityHistory, stats.quality]);

  // Get recommended actions based on quality
  const getRecommendedActions = useCallback((): string[] => {
    const actions: string[] = [];
    
    if (stats.packetLoss > 5) {
      actions.push('Consider moving closer to your router');
      actions.push('Close bandwidth-heavy applications');
    }
    
    if (stats.latency > 200) {
      actions.push('Check your network connection');
      actions.push('Try using a wired connection');
    }
    
    if (stats.jitter > 30) {
      actions.push('Network is unstable');
      actions.push('Avoid streaming or large downloads');
    }
    
    return actions;
  }, [stats]);

  return {
    stats,
    quality: stats.quality,
    smoothedQuality: getSmoothedQuality(),
    qualityHistory,
    recommendedActions: getRecommendedActions(),
    isMonitoring: !!monitorIntervalRef.current
  };
}
