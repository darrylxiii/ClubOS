import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QualityStats {
  packetLoss: number;
  latency: number;
  jitter: number;
  bitrate: number;
  videoBitrate: number;
  connectionState: string;
  codec?: string;
  fecEnabled?: boolean;
  turnUsed?: boolean;
}

interface UseMeetingQualityMonitorOptions {
  meetingId: string;
  userId: string;
  peerConnections: Map<string, RTCPeerConnection>;
  enabled?: boolean;
  intervalMs?: number;
}

function getQualityLevel(stats: QualityStats): 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected' {
  if (stats.connectionState === 'disconnected' || stats.connectionState === 'failed') {
    return 'disconnected';
  }
  
  if (stats.packetLoss > 10 || stats.latency > 500 || stats.jitter > 100) {
    return 'poor';
  }
  
  if (stats.packetLoss > 5 || stats.latency > 300 || stats.jitter > 50) {
    return 'fair';
  }
  
  if (stats.packetLoss > 2 || stats.latency > 150 || stats.jitter > 30) {
    return 'good';
  }
  
  return 'excellent';
}

export function useMeetingQualityMonitor({
  meetingId,
  userId,
  peerConnections,
  enabled = true,
  intervalMs = 5000
}: UseMeetingQualityMonitorOptions) {
  const lastStatsRef = useRef<Map<string, RTCStatsReport>>(new Map());

  const collectStats = useCallback(async (): Promise<QualityStats | null> => {
    if (peerConnections.size === 0) return null;

    let totalPacketLoss = 0;
    let totalLatency = 0;
    let totalJitter = 0;
    let totalBitrate = 0;
    let totalVideoBitrate = 0;
    let connectionStates: string[] = [];
    let codec: string | undefined;
    let turnUsed = false;
    let count = 0;

    for (const [peerId, pc] of peerConnections) {
      try {
        const stats = await pc.getStats();
        const lastStats = lastStatsRef.current.get(peerId);
        
        stats.forEach(report => {
          // Check for TURN usage
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            const localCandidate = stats.get(report.localCandidateId);
            if (localCandidate?.candidateType === 'relay') {
              turnUsed = true;
            }
          }
          
          // Inbound RTP for packet loss and jitter
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
              const totalPackets = report.packetsLost + report.packetsReceived;
              if (totalPackets > 0) {
                totalPacketLoss += (report.packetsLost / totalPackets) * 100;
                count++;
              }
            }
            if (report.jitter !== undefined) {
              totalJitter += report.jitter * 1000; // Convert to ms
            }
          }
          
          // Remote inbound RTP for round-trip time
          if (report.type === 'remote-inbound-rtp') {
            if (report.roundTripTime !== undefined) {
              totalLatency += report.roundTripTime * 1000; // Convert to ms
            }
          }
          
          // Outbound RTP for bitrate
          if (report.type === 'outbound-rtp' && lastStats) {
            const lastReport = lastStats.get(report.id) as any;
            if (lastReport && report.bytesSent !== undefined && lastReport.bytesSent !== undefined) {
              const bytesDiff = report.bytesSent - lastReport.bytesSent;
              const timeDiff = (report.timestamp - lastReport.timestamp) / 1000;
              if (timeDiff > 0) {
                const bitrate = (bytesDiff * 8) / timeDiff / 1000; // kbps
                if (report.kind === 'video') {
                  totalVideoBitrate += bitrate;
                }
                totalBitrate += bitrate;
              }
            }
          }
          
          // Codec info
          if (report.type === 'codec' && report.mimeType?.includes('video')) {
            codec = report.mimeType;
          }
        });
        
        connectionStates.push(pc.connectionState);
        lastStatsRef.current.set(peerId, stats);
      } catch (error) {
        console.error('[QualityMonitor] Failed to get stats for peer:', peerId, error);
      }
    }

    const avgCount = Math.max(count, 1);
    const connectionState = connectionStates.includes('failed') ? 'failed' 
      : connectionStates.includes('disconnected') ? 'disconnected'
      : connectionStates.includes('connecting') ? 'connecting'
      : 'connected';

    return {
      packetLoss: totalPacketLoss / avgCount,
      latency: totalLatency / avgCount,
      jitter: totalJitter / avgCount,
      bitrate: totalBitrate,
      videoBitrate: totalVideoBitrate,
      connectionState,
      codec,
      turnUsed
    };
  }, [peerConnections]);

  const saveStats = useCallback(async (stats: QualityStats) => {
    try {
      await supabase.from('meeting_connection_stats').insert({
        meeting_id: meetingId,
        user_id: userId,
        packet_loss_percent: Math.round(stats.packetLoss * 100) / 100,
        latency_ms: Math.round(stats.latency),
        jitter_ms: Math.round(stats.jitter),
        bitrate_kbps: Math.round(stats.bitrate),
        video_bitrate_kbps: Math.round(stats.videoBitrate),
        connection_state: stats.connectionState,
        quality_level: getQualityLevel(stats),
        codec: stats.codec,
        turn_used: stats.turnUsed
      });
    } catch (error) {
      console.error('[QualityMonitor] Failed to save stats:', error);
    }
  }, [meetingId, userId]);

  useEffect(() => {
    if (!enabled || peerConnections.size === 0) return;

    const interval = setInterval(async () => {
      const stats = await collectStats();
      if (stats) {
        await saveStats(stats);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, peerConnections, intervalMs, collectStats, saveStats]);

  return { collectStats };
}
