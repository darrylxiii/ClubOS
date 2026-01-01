/**
 * Per-Participant Network Quality Tracking
 * Real-time quality badges (Excellent/Good/Fair/Poor) for each video tile
 * Shows packet loss, latency, and jitter per participant
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export interface ParticipantQualityStats {
  participantId: string;
  quality: QualityLevel;
  packetLoss: number; // percentage
  latency: number; // ms
  jitter: number; // ms
  bitrate: number; // kbps
  framesPerSecond: number;
  framesDropped: number;
  audioLevel: number; // 0-1
  lastUpdated: number;
}

interface UseParticipantQualityProps {
  peerConnections: Map<string, RTCPeerConnection>;
  enabled: boolean;
  updateInterval?: number; // ms
}

const QUALITY_THRESHOLDS = {
  excellent: { packetLoss: 0.5, latency: 50, jitter: 10 },
  good: { packetLoss: 2, latency: 150, jitter: 30 },
  fair: { packetLoss: 5, latency: 300, jitter: 60 },
  // Anything worse is 'poor'
};

export function useParticipantQuality({
  peerConnections,
  enabled,
  updateInterval = 2000
}: UseParticipantQualityProps) {
  const [participantStats, setParticipantStats] = useState<Map<string, ParticipantQualityStats>>(new Map());
  const previousStatsRef = useRef<Map<string, {
    packetsReceived: number;
    packetsLost: number;
    bytesReceived: number;
    framesReceived: number;
    framesDropped: number;
    timestamp: number;
  }>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateQuality = useCallback((
    packetLoss: number,
    latency: number,
    jitter: number
  ): QualityLevel => {
    if (
      packetLoss <= QUALITY_THRESHOLDS.excellent.packetLoss &&
      latency <= QUALITY_THRESHOLDS.excellent.latency &&
      jitter <= QUALITY_THRESHOLDS.excellent.jitter
    ) {
      return 'excellent';
    }
    if (
      packetLoss <= QUALITY_THRESHOLDS.good.packetLoss &&
      latency <= QUALITY_THRESHOLDS.good.latency &&
      jitter <= QUALITY_THRESHOLDS.good.jitter
    ) {
      return 'good';
    }
    if (
      packetLoss <= QUALITY_THRESHOLDS.fair.packetLoss &&
      latency <= QUALITY_THRESHOLDS.fair.latency &&
      jitter <= QUALITY_THRESHOLDS.fair.jitter
    ) {
      return 'fair';
    }
    return 'poor';
  }, []);

  const collectPeerStats = useCallback(async (
    peerId: string,
    pc: RTCPeerConnection
  ): Promise<ParticipantQualityStats | null> => {
    if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
      return null;
    }

    try {
      const stats = await pc.getStats();
      const now = Date.now();

      let packetsReceived = 0;
      let packetsLost = 0;
      let bytesReceived = 0;
      let framesReceived = 0;
      let framesDropped = 0;
      let framesPerSecond = 0;
      let latency = 0;
      let jitter = 0;
      let audioLevel = 0;

      stats.forEach(report => {
        // Video inbound stats
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetsReceived += report.packetsReceived || 0;
          packetsLost += report.packetsLost || 0;
          framesReceived = report.framesReceived || 0;
          framesDropped = report.framesDropped || 0;
          framesPerSecond = report.framesPerSecond || 0;
          jitter = Math.max(jitter, (report.jitter || 0) * 1000);
        }

        // Audio inbound stats
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          packetsReceived += report.packetsReceived || 0;
          packetsLost += report.packetsLost || 0;
          jitter = Math.max(jitter, (report.jitter || 0) * 1000);
        }

        // Audio level
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          audioLevel = report.audioLevel || 0;
        }

        // Latency from candidate pair
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          latency = (report.currentRoundTripTime || 0) * 1000;
        }

        // Bytes for bitrate calculation
        if (report.type === 'transport') {
          bytesReceived = report.bytesReceived || 0;
        }
      });

      // Calculate deltas
      const prevStats = previousStatsRef.current.get(peerId);
      let packetLoss = 0;
      let bitrate = 0;
      let calculatedFps = framesPerSecond;

      if (prevStats) {
        const timeDiff = (now - prevStats.timestamp) / 1000;
        const newPacketsReceived = packetsReceived - prevStats.packetsReceived;
        const newPacketsLost = packetsLost - prevStats.packetsLost;
        const totalNewPackets = newPacketsReceived + newPacketsLost;

        if (totalNewPackets > 0) {
          packetLoss = (newPacketsLost / totalNewPackets) * 100;
        }

        const bytesDiff = bytesReceived - prevStats.bytesReceived;
        bitrate = timeDiff > 0 ? (bytesDiff * 8) / timeDiff / 1000 : 0;

        // Calculate FPS from frames delta if not reported
        if (!framesPerSecond && timeDiff > 0) {
          const framesDiff = framesReceived - prevStats.framesReceived;
          calculatedFps = framesDiff / timeDiff;
        }
      }

      // Store for next calculation
      previousStatsRef.current.set(peerId, {
        packetsReceived,
        packetsLost,
        bytesReceived,
        framesReceived,
        framesDropped,
        timestamp: now
      });

      const quality = calculateQuality(packetLoss, latency, jitter);

      return {
        participantId: peerId,
        quality,
        packetLoss: Math.round(packetLoss * 100) / 100,
        latency: Math.round(latency),
        jitter: Math.round(jitter),
        bitrate: Math.round(bitrate),
        framesPerSecond: Math.round(calculatedFps),
        framesDropped,
        audioLevel,
        lastUpdated: now
      };
    } catch (error) {
      console.error('[ParticipantQuality] Error collecting stats for:', peerId, error);
      return null;
    }
  }, [calculateQuality]);

  const collectAllStats = useCallback(async () => {
    if (peerConnections.size === 0) return;

    const newStats = new Map<string, ParticipantQualityStats>();

    for (const [peerId, pc] of peerConnections.entries()) {
      const stats = await collectPeerStats(peerId, pc);
      if (stats) {
        newStats.set(peerId, stats);
      }
    }

    setParticipantStats(newStats);
  }, [peerConnections, collectPeerStats]);

  // Start/stop monitoring
  useEffect(() => {
    if (enabled && peerConnections.size > 0) {
      collectAllStats();
      intervalRef.current = setInterval(collectAllStats, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, peerConnections.size, updateInterval, collectAllStats]);

  // Cleanup stale peers
  useEffect(() => {
    const currentPeerIds = new Set(peerConnections.keys());
    previousStatsRef.current.forEach((_, peerId) => {
      if (!currentPeerIds.has(peerId)) {
        previousStatsRef.current.delete(peerId);
      }
    });
  }, [peerConnections.size]);

  // Get stats for a specific participant
  const getParticipantStats = useCallback((participantId: string): ParticipantQualityStats | null => {
    return participantStats.get(participantId) || null;
  }, [participantStats]);

  // Get worst quality participant
  const getWorstQualityParticipant = useCallback((): ParticipantQualityStats | null => {
    const qualityOrder: QualityLevel[] = ['excellent', 'good', 'fair', 'poor', 'unknown'];
    let worst: ParticipantQualityStats | null = null;

    participantStats.forEach(stats => {
      if (!worst || qualityOrder.indexOf(stats.quality) > qualityOrder.indexOf(worst.quality)) {
        worst = stats;
      }
    });

    return worst;
  }, [participantStats]);

  // Get quality color for UI
  const getQualityColor = useCallback((quality: QualityLevel): string => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-emerald-400';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-400';
    }
  }, []);

  // Get quality background for badges
  const getQualityBgColor = useCallback((quality: QualityLevel): string => {
    switch (quality) {
      case 'excellent': return 'bg-green-500/20';
      case 'good': return 'bg-emerald-400/20';
      case 'fair': return 'bg-yellow-500/20';
      case 'poor': return 'bg-red-500/20';
      default: return 'bg-gray-500/20';
    }
  }, []);

  return {
    participantStats,
    getParticipantStats,
    getWorstQualityParticipant,
    getQualityColor,
    getQualityBgColor,
    isMonitoring: !!intervalRef.current
  };
}
