/**
 * Intelligent Bandwidth Allocation Manager
 * Ensures audio never drops even when video degrades
 * 
 * Priority order: Audio > Screen Share > Camera Video
 * Audio is ALWAYS guaranteed minimum bandwidth
 */

import { useCallback, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

export interface BandwidthAllocation {
  audio: number;      // kbps
  screenShare: number; // kbps
  camera: number;      // kbps
  total: number;       // kbps
}

export interface BandwidthPriorities {
  audioMinimum: number;      // Guaranteed minimum for audio
  audioOptimal: number;      // Optimal audio bitrate
  screenShareMinimum: number;
  screenShareOptimal: number;
  cameraMinimum: number;
  cameraOptimal: number;
}

const DEFAULT_PRIORITIES: BandwidthPriorities = {
  audioMinimum: 24,      // 24 kbps - absolute minimum for voice
  audioOptimal: 64,      // 64 kbps - high quality voice
  screenShareMinimum: 300,  // 300 kbps for basic screen share
  screenShareOptimal: 2000, // 2 Mbps for crisp screen share
  cameraMinimum: 100,    // 100 kbps - low quality video
  cameraOptimal: 2500    // 2.5 Mbps - 720p video
};

export interface AllocationResult {
  allocation: BandwidthAllocation;
  warnings: string[];
  shouldPauseCamera: boolean;
  qualityLevel: 'excellent' | 'good' | 'degraded' | 'poor' | 'critical';
}

export function useBandwidthAllocator(priorities: BandwidthPriorities = DEFAULT_PRIORITIES) {
  const [currentAllocation, setCurrentAllocation] = useState<BandwidthAllocation | null>(null);
  const lastEstimatedBandwidthRef = useRef<number>(5000); // Default 5 Mbps assumption
  const isScreenSharingRef = useRef<boolean>(false);

  /**
   * Calculate optimal bandwidth allocation based on available bandwidth
   */
  const allocateBandwidth = useCallback((
    estimatedBandwidthKbps: number,
    isScreenSharing: boolean = false
  ): AllocationResult => {
    lastEstimatedBandwidthRef.current = estimatedBandwidthKbps;
    isScreenSharingRef.current = isScreenSharing;
    
    const warnings: string[] = [];
    let shouldPauseCamera = false;
    let qualityLevel: 'excellent' | 'good' | 'degraded' | 'poor' | 'critical' = 'excellent';
    
    // ALWAYS reserve audio minimum first
    let audioAllocation = priorities.audioMinimum;
    let screenShareAllocation = 0;
    let cameraAllocation = 0;
    
    let remainingBandwidth = estimatedBandwidthKbps - audioAllocation;
    
    // Critical: not enough for even minimum audio
    if (remainingBandwidth < 0) {
      warnings.push('Extremely low bandwidth - audio may cut out');
      qualityLevel = 'critical';
      
      return {
        allocation: {
          audio: estimatedBandwidthKbps, // Give everything to audio
          screenShare: 0,
          camera: 0,
          total: estimatedBandwidthKbps
        },
        warnings,
        shouldPauseCamera: true,
        qualityLevel
      };
    }
    
    // Allocate screen share if active (priority over camera)
    if (isScreenSharing) {
      if (remainingBandwidth >= priorities.screenShareOptimal) {
        screenShareAllocation = priorities.screenShareOptimal;
        remainingBandwidth -= screenShareAllocation;
      } else if (remainingBandwidth >= priorities.screenShareMinimum) {
        screenShareAllocation = remainingBandwidth * 0.7; // 70% to screen share
        remainingBandwidth -= screenShareAllocation;
        warnings.push('Screen share quality reduced');
        qualityLevel = 'degraded';
      } else {
        screenShareAllocation = Math.max(remainingBandwidth * 0.5, priorities.screenShareMinimum / 2);
        remainingBandwidth -= screenShareAllocation;
        warnings.push('Screen share significantly degraded');
        qualityLevel = 'poor';
      }
    }
    
    // Allocate camera video with remaining bandwidth
    if (remainingBandwidth >= priorities.cameraOptimal) {
      cameraAllocation = priorities.cameraOptimal;
      remainingBandwidth -= cameraAllocation;
    } else if (remainingBandwidth >= priorities.cameraMinimum) {
      cameraAllocation = remainingBandwidth;
      remainingBandwidth = 0;
      
      if (cameraAllocation < 500) {
        warnings.push('Camera quality reduced to save bandwidth');
        if (qualityLevel === 'excellent') qualityLevel = 'good';
      }
    } else if (remainingBandwidth > 0) {
      // Very low bandwidth - consider pausing camera
      if (isScreenSharing) {
        shouldPauseCamera = true;
        warnings.push('Camera paused to maintain screen share quality');
        qualityLevel = 'degraded';
      } else {
      cameraAllocation = remainingBandwidth;
        warnings.push('Video quality severely limited');
        qualityLevel = 'poor';
      }
      remainingBandwidth = 0;
    } else {
      shouldPauseCamera = true;
      warnings.push('Insufficient bandwidth for camera');
      qualityLevel = 'poor';
    }
    
    // Use remaining bandwidth to upgrade audio quality
    if (remainingBandwidth > 0 && audioAllocation < priorities.audioOptimal) {
      const additionalAudio = Math.min(
        priorities.audioOptimal - audioAllocation,
        remainingBandwidth
      );
      audioAllocation += additionalAudio;
      remainingBandwidth -= additionalAudio;
    }
    
    const allocation: BandwidthAllocation = {
      audio: Math.round(audioAllocation),
      screenShare: Math.round(screenShareAllocation),
      camera: Math.round(cameraAllocation),
      total: Math.round(audioAllocation + screenShareAllocation + cameraAllocation)
    };
    
    setCurrentAllocation(allocation);
    
    console.log('[BandwidthAllocator] Allocation result:', {
      estimated: estimatedBandwidthKbps,
      allocation,
      qualityLevel,
      warnings
    });
    
    return {
      allocation,
      warnings,
      shouldPauseCamera,
      qualityLevel
    };
  }, [priorities]);

  /**
   * Apply bandwidth allocation to RTCPeerConnection senders
   */
  const applyAllocation = useCallback(async (
    pc: RTCPeerConnection,
    allocation: BandwidthAllocation
  ): Promise<void> => {
    const senders = pc.getSenders();
    
    for (const sender of senders) {
      if (!sender.track) continue;
      
      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        
        if (sender.track.kind === 'audio') {
          params.encodings[0].maxBitrate = allocation.audio * 1000;
          params.encodings[0].priority = 'high';
          params.encodings[0].networkPriority = 'high';
        } else if (sender.track.kind === 'video') {
          // Check if this is screen share or camera based on track label
          const isScreenShare = sender.track.label.toLowerCase().includes('screen') ||
                               sender.track.label.toLowerCase().includes('window') ||
                               sender.track.label.toLowerCase().includes('display');
          
          if (isScreenShare) {
            params.encodings[0].maxBitrate = allocation.screenShare * 1000;
            params.encodings[0].priority = 'medium';
            params.encodings[0].networkPriority = 'medium';
          } else {
            params.encodings[0].maxBitrate = allocation.camera * 1000;
            params.encodings[0].priority = 'low';
            params.encodings[0].networkPriority = 'low';
          }
        }
        
        await sender.setParameters(params);
      } catch (error) {
        logger.warn('Failed to apply allocation to sender', { componentName: 'BandwidthAllocator', error });
      }
    }
    
    logger.debug('Applied allocation to peer connection', { componentName: 'BandwidthAllocator' });
  }, []);

  /**
   * Estimate available bandwidth from RTCPeerConnection stats
   */
  const estimateBandwidth = useCallback(async (
    pc: RTCPeerConnection
  ): Promise<number> => {
    try {
      const stats = await pc.getStats();
      let estimatedBandwidth = 5000; // Default 5 Mbps
      
      stats.forEach((report) => {
        // Check candidate-pair for available outgoing bitrate
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.availableOutgoingBitrate) {
            estimatedBandwidth = report.availableOutgoingBitrate / 1000; // Convert to kbps
          }
        }
        
        // Fallback: use current send bitrate as estimate
        if (report.type === 'outbound-rtp' && report.bytesSent) {
          const bitrateBps = (report.bytesSent * 8) / (report.timestamp / 1000);
          if (bitrateBps > 0 && !report.availableOutgoingBitrate) {
            estimatedBandwidth = Math.max(estimatedBandwidth, bitrateBps / 1000 * 1.5); // Assume 50% headroom
          }
        }
      });
      
      lastEstimatedBandwidthRef.current = estimatedBandwidth;
      return estimatedBandwidth;
    } catch (error) {
      logger.warn('Failed to estimate bandwidth', { componentName: 'BandwidthAllocator', error });
      return lastEstimatedBandwidthRef.current;
    }
  }, []);

  /**
   * Get quality level description for UI
   */
  const getQualityDescription = useCallback((level: AllocationResult['qualityLevel']): string => {
    switch (level) {
      case 'excellent': return 'Excellent connection quality';
      case 'good': return 'Good connection quality';
      case 'degraded': return 'Connection quality degraded';
      case 'poor': return 'Poor connection - video reduced';
      case 'critical': return 'Critical - audio only mode';
    }
  }, []);

  return {
    allocateBandwidth,
    applyAllocation,
    estimateBandwidth,
    currentAllocation,
    getQualityDescription,
    priorities
  };
}
