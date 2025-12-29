import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionQuality, ConnectionStats } from './useConnectionQuality';
import { logger } from '@/lib/logger';

interface UseMeetingConnectionQualityProps {
  peerConnections: Map<string, RTCPeerConnection>;
  meetingId: string;
  userId: string;
  enabled: boolean;
  onQualityChange?: (quality: ConnectionQuality) => void;
}

interface PeerStats {
  peerId: string;
  quality: ConnectionQuality;
  packetLoss: number;
  latency: number;
  jitter: number;
  bitrate: number;
}

// Quality thresholds
const QUALITY_THRESHOLDS = {
  excellent: { packetLoss: 1, latency: 50, jitter: 10 },
  good: { packetLoss: 3, latency: 150, jitter: 30 },
  fair: { packetLoss: 8, latency: 300, jitter: 50 },
  poor: { packetLoss: 15, latency: 500, jitter: 100 }
};

export type AdaptiveAction = 'none' | 'downgrade-quality' | 'audio-only';

/**
 * Multi-peer connection quality monitoring for meetings
 * Aggregates quality across all peer connections
 */
export function useMeetingConnectionQuality({
  peerConnections,
  meetingId,
  userId,
  enabled,
  onQualityChange
}: UseMeetingConnectionQualityProps) {
  const [overallStats, setOverallStats] = useState<ConnectionStats>({
    quality: 'disconnected',
    packetLoss: 0,
    latency: 0,
    jitter: 0,
    bitrate: 0,
    timestamp: Date.now()
  });

  const [peerStats, setPeerStats] = useState<Map<string, PeerStats>>(new Map());
  const [worstQuality, setWorstQuality] = useState<ConnectionQuality>('disconnected');
  const [suggestedAction, setSuggestedAction] = useState<AdaptiveAction>('none');

  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatsRef = useRef<Map<string, {
    packetsReceived: number;
    packetsLost: number;
    bytesReceived: number;
    timestamp: number;
  }>>(new Map());

  const lastQualityRef = useRef<ConnectionQuality>('disconnected');
  const logCountRef = useRef(0);

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

  const collectStatsForPeer = useCallback(async (peerId: string, pc: RTCPeerConnection): Promise<PeerStats | null> => {
    if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
      return null;
    }

    try {
      const rtcStats = await pc.getStats();
      let currentPacketsReceived = 0;
      let currentPacketsLost = 0;
      let currentBytesReceived = 0;
      let latency = 0;
      let jitter = 0;

      rtcStats.forEach(report => {
        if (report.type === 'inbound-rtp') {
          currentPacketsReceived += report.packetsReceived || 0;
          currentPacketsLost += report.packetsLost || 0;
          jitter = Math.max(jitter, (report.jitter || 0) * 1000);
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          latency = (report.currentRoundTripTime || 0) * 1000;
        }
        if (report.type === 'transport') {
          currentBytesReceived = report.bytesReceived || 0;
        }
      });

      const now = Date.now();
      let packetLoss = 0;
      let bitrate = 0;

      const prevStats = previousStatsRef.current.get(peerId);
      if (prevStats) {
        const timeDiff = (now - prevStats.timestamp) / 1000;
        const newPacketsReceived = currentPacketsReceived - prevStats.packetsReceived;
        const newPacketsLost = currentPacketsLost - prevStats.packetsLost;
        const totalNewPackets = newPacketsReceived + newPacketsLost;

        if (totalNewPackets > 0) {
          packetLoss = (newPacketsLost / totalNewPackets) * 100;
        }

        const bytesDiff = currentBytesReceived - prevStats.bytesReceived;
        bitrate = timeDiff > 0 ? (bytesDiff * 8) / timeDiff / 1000 : 0;
      }

      previousStatsRef.current.set(peerId, {
        packetsReceived: currentPacketsReceived,
        packetsLost: currentPacketsLost,
        bytesReceived: currentBytesReceived,
        timestamp: now
      });

      const quality = calculateQuality(packetLoss, latency, jitter);

      return {
        peerId,
        quality,
        packetLoss,
        latency,
        jitter,
        bitrate
      };
    } catch (error) {
      console.error('[MeetingQuality] Error collecting stats for peer:', peerId, error);
      return null;
    }
  }, [calculateQuality]);

  const collectAllStats = useCallback(async () => {
    if (peerConnections.size === 0) {
      setOverallStats(prev => ({ ...prev, quality: 'disconnected' }));
      setWorstQuality('disconnected');
      return;
    }

    const newPeerStats = new Map<string, PeerStats>();
    let totalPacketLoss = 0;
    let maxLatency = 0;
    let maxJitter = 0;
    let totalBitrate = 0;
    let validPeerCount = 0;
    let worstQualityValue: ConnectionQuality = 'excellent';

    const qualityOrder: ConnectionQuality[] = ['excellent', 'good', 'fair', 'poor', 'disconnected'];

    for (const [peerId, pc] of peerConnections.entries()) {
      const stats = await collectStatsForPeer(peerId, pc);
      if (stats) {
        newPeerStats.set(peerId, stats);
        totalPacketLoss += stats.packetLoss;
        maxLatency = Math.max(maxLatency, stats.latency);
        maxJitter = Math.max(maxJitter, stats.jitter);
        totalBitrate += stats.bitrate;
        validPeerCount++;

        // Track worst quality
        if (qualityOrder.indexOf(stats.quality) > qualityOrder.indexOf(worstQualityValue)) {
          worstQualityValue = stats.quality;
        }
      }
    }

    setPeerStats(newPeerStats);
    setWorstQuality(worstQualityValue);

    const avgPacketLoss = validPeerCount > 0 ? totalPacketLoss / validPeerCount : 0;
    const overallQuality = calculateQuality(avgPacketLoss, maxLatency, maxJitter);
    const now = Date.now();

    setOverallStats({
      quality: overallQuality,
      packetLoss: avgPacketLoss,
      latency: maxLatency,
      jitter: maxJitter,
      bitrate: totalBitrate,
      timestamp: now
    });

    // Calculate suggested action
    let newAction: AdaptiveAction = 'none';
    if (avgPacketLoss > 15 || maxLatency > 1000) {
      newAction = 'audio-only';
    } else if (avgPacketLoss > 5 || maxLatency > 400) {
      newAction = 'downgrade-quality';
    }
    setSuggestedAction(newAction);

    // Notify on quality change
    if (overallQuality !== lastQualityRef.current) {
      lastQualityRef.current = overallQuality;
      onQualityChange?.(overallQuality);
    }

    // Log to database periodically (every 10th collection) if quality is poor
    logCountRef.current++;
    if (logCountRef.current >= 10 && (worstQualityValue === 'poor' || worstQualityValue === 'fair')) {
      logCountRef.current = 0;

      // Log quality issues (fire-and-forget, non-blocking)
      logger.warn('Meeting quality degraded', {
        componentName: 'MeetingConnectionQuality',
        quality: worstQualityValue,
        packetLoss: avgPacketLoss.toFixed(1) + '%',
        latency: maxLatency.toFixed(0) + 'ms',
        jitter: maxJitter.toFixed(0) + 'ms'
      });
    }
  }, [peerConnections, calculateQuality, collectStatsForPeer, meetingId, userId, onQualityChange]);

  useEffect(() => {
    if (enabled && peerConnections.size > 0) {
      // Monitor every 2 seconds
      monitorIntervalRef.current = setInterval(collectAllStats, 2000);
      collectAllStats();
    }

    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
  }, [enabled, peerConnections.size, collectAllStats]);

  // Clean up old peer stats
  useEffect(() => {
    const currentPeerIds = new Set(peerConnections.keys());

    previousStatsRef.current.forEach((_, peerId) => {
      if (!currentPeerIds.has(peerId)) {
        previousStatsRef.current.delete(peerId);
      }
    });
  }, [peerConnections.size]);

  const getRecommendedActions = useCallback((): string[] => {
    const actions: string[] = [];

    if (overallStats.packetLoss > 5) {
      actions.push('High packet loss detected - check your network');
    }
    if (overallStats.latency > 200) {
      actions.push('High latency - try a wired connection');
    }
    if (overallStats.jitter > 30) {
      actions.push('Network instability - close other applications');
    }

    return actions;
  }, [overallStats]);

  return {
    overallStats,
    peerStats,
    quality: overallStats.quality,
    worstQuality,
    recommendedActions: getRecommendedActions(),
    suggestedAction,
    isMonitoring: !!monitorIntervalRef.current
  };
}
