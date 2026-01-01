import { useState, useCallback, useRef, useEffect } from 'react';

interface ParticipantPriority {
  participantId: string;
  priority: 'high' | 'medium' | 'low';
  isSpeaking: boolean;
  isScreenSharing: boolean;
  isPinned: boolean;
  lastSpoke: number;
  allocatedBandwidth: number;
  targetQuality: 'high' | 'medium' | 'low' | 'audio-only';
}

interface BandwidthAllocation {
  totalAvailable: number;
  allocated: Map<string, number>;
  reserved: number;
  overhead: number;
}

interface UseSmartBandwidthConfig {
  totalBandwidth: number;           // Total available bandwidth in bps
  activeSpeakerBoost: number;       // Multiplier for active speaker (e.g., 2.0)
  screenSharePriority: boolean;     // Prioritize screen shares
  minQualityBandwidth: number;      // Minimum bandwidth per participant
  speakerDecayMs: number;           // Time before speaker priority decays
  reallocationIntervalMs: number;   // How often to reallocate
}

interface UseSmartBandwidthReturn {
  priorities: Map<string, ParticipantPriority>;
  allocation: BandwidthAllocation;
  activeSpeakerId: string | null;
  addParticipant: (participantId: string) => void;
  removeParticipant: (participantId: string) => void;
  updateSpeakingState: (participantId: string, isSpeaking: boolean) => void;
  updateScreenShareState: (participantId: string, isSharing: boolean) => void;
  pinParticipant: (participantId: string, pinned: boolean) => void;
  setTotalBandwidth: (bandwidth: number) => void;
  getTargetBitrate: (participantId: string) => number;
  getTargetResolution: (participantId: string) => { width: number; height: number };
  forceReallocation: () => void;
}

const DEFAULT_CONFIG: UseSmartBandwidthConfig = {
  totalBandwidth: 2500000,         // 2.5 Mbps default
  activeSpeakerBoost: 2.5,
  screenSharePriority: true,
  minQualityBandwidth: 100000,     // 100 Kbps minimum
  speakerDecayMs: 3000,            // 3 seconds
  reallocationIntervalMs: 1000,    // 1 second
};

const QUALITY_PRESETS = {
  high: { width: 1280, height: 720, bitrate: 1500000 },
  medium: { width: 640, height: 480, bitrate: 600000 },
  low: { width: 320, height: 240, bitrate: 200000 },
  'audio-only': { width: 0, height: 0, bitrate: 0 },
};

export function useSmartBandwidth(
  config: Partial<UseSmartBandwidthConfig> = {}
): UseSmartBandwidthReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [priorities, setPriorities] = useState<Map<string, ParticipantPriority>>(new Map());
  const [allocation, setAllocation] = useState<BandwidthAllocation>({
    totalAvailable: mergedConfig.totalBandwidth,
    allocated: new Map(),
    reserved: 0,
    overhead: 50000, // 50 Kbps for signaling overhead
  });
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  const configRef = useRef(mergedConfig);
  const reallocationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    configRef.current = mergedConfig;
  }, [mergedConfig]);

  useEffect(() => {
    // Start periodic reallocation
    reallocationTimerRef.current = setInterval(() => {
      reallocateBandwidth();
    }, configRef.current.reallocationIntervalMs);

    return () => {
      if (reallocationTimerRef.current) {
        clearInterval(reallocationTimerRef.current);
      }
    };
  }, []);

  const calculatePriority = useCallback((participant: ParticipantPriority): number => {
    let score = 0;
    const now = Date.now();
    const config = configRef.current;

    // Base priority
    score += participant.priority === 'high' ? 100 : participant.priority === 'medium' ? 50 : 25;

    // Active speaker boost
    if (participant.isSpeaking) {
      score += 200 * config.activeSpeakerBoost;
    } else if (now - participant.lastSpoke < config.speakerDecayMs) {
      // Gradual decay for recent speakers
      const decay = 1 - (now - participant.lastSpoke) / config.speakerDecayMs;
      score += 100 * decay;
    }

    // Screen sharing priority
    if (participant.isScreenSharing && config.screenSharePriority) {
      score += 300;
    }

    // Pinned participant boost
    if (participant.isPinned) {
      score += 150;
    }

    return score;
  }, []);

  const reallocateBandwidth = useCallback(() => {
    setPriorities(currentPriorities => {
      if (currentPriorities.size === 0) return currentPriorities;

      const config = configRef.current;
      const availableBandwidth = config.totalBandwidth - allocation.overhead;
      
      // Calculate priority scores
      const participantScores: Array<{ id: string; score: number; participant: ParticipantPriority }> = [];
      
      currentPriorities.forEach((participant, id) => {
        participantScores.push({
          id,
          score: calculatePriority(participant),
          participant,
        });
      });

      // Sort by priority score
      participantScores.sort((a, b) => b.score - a.score);

      // Find active speaker
      const newActiveSpeaker = participantScores.find(p => p.participant.isSpeaking);
      if (newActiveSpeaker) {
        setActiveSpeakerId(newActiveSpeaker.id);
      }

      // Calculate total weight
      const totalScore = participantScores.reduce((sum, p) => sum + p.score, 0);
      
      // Allocate bandwidth proportionally
      const newAllocations = new Map<string, number>();
      const updatedPriorities = new Map<string, ParticipantPriority>();

      participantScores.forEach(({ id, score, participant }) => {
        // Base allocation proportional to score
        let allocatedBandwidth = (score / totalScore) * availableBandwidth;
        
        // Ensure minimum bandwidth
        allocatedBandwidth = Math.max(allocatedBandwidth, config.minQualityBandwidth);
        
        // Determine target quality
        let targetQuality: 'high' | 'medium' | 'low' | 'audio-only';
        if (allocatedBandwidth >= QUALITY_PRESETS.high.bitrate * 0.8) {
          targetQuality = 'high';
        } else if (allocatedBandwidth >= QUALITY_PRESETS.medium.bitrate * 0.8) {
          targetQuality = 'medium';
        } else if (allocatedBandwidth >= QUALITY_PRESETS.low.bitrate * 0.8) {
          targetQuality = 'low';
        } else {
          targetQuality = 'audio-only';
        }

        newAllocations.set(id, allocatedBandwidth);
        updatedPriorities.set(id, {
          ...participant,
          allocatedBandwidth,
          targetQuality,
        });
      });

      setAllocation(prev => ({
        ...prev,
        allocated: newAllocations,
        reserved: availableBandwidth - Array.from(newAllocations.values()).reduce((a, b) => a + b, 0),
      }));

      return updatedPriorities;
    });
  }, [allocation.overhead, calculatePriority]);

  const addParticipant = useCallback((participantId: string) => {
    setPriorities(prev => {
      const updated = new Map(prev);
      updated.set(participantId, {
        participantId,
        priority: 'medium',
        isSpeaking: false,
        isScreenSharing: false,
        isPinned: false,
        lastSpoke: 0,
        allocatedBandwidth: configRef.current.minQualityBandwidth,
        targetQuality: 'medium',
      });
      return updated;
    });
    
    // Trigger reallocation
    setTimeout(reallocateBandwidth, 100);
  }, [reallocateBandwidth]);

  const removeParticipant = useCallback((participantId: string) => {
    setPriorities(prev => {
      const updated = new Map(prev);
      updated.delete(participantId);
      return updated;
    });
    
    setAllocation(prev => {
      const updated = new Map(prev.allocated);
      updated.delete(participantId);
      return { ...prev, allocated: updated };
    });

    if (activeSpeakerId === participantId) {
      setActiveSpeakerId(null);
    }
    
    // Trigger reallocation
    setTimeout(reallocateBandwidth, 100);
  }, [activeSpeakerId, reallocateBandwidth]);

  const updateSpeakingState = useCallback((participantId: string, isSpeaking: boolean) => {
    setPriorities(prev => {
      const participant = prev.get(participantId);
      if (!participant) return prev;

      const updated = new Map(prev);
      updated.set(participantId, {
        ...participant,
        isSpeaking,
        lastSpoke: isSpeaking ? Date.now() : participant.lastSpoke,
      });
      return updated;
    });

    if (isSpeaking) {
      setActiveSpeakerId(participantId);
    }
  }, []);

  const updateScreenShareState = useCallback((participantId: string, isSharing: boolean) => {
    setPriorities(prev => {
      const participant = prev.get(participantId);
      if (!participant) return prev;

      const updated = new Map(prev);
      updated.set(participantId, {
        ...participant,
        isScreenSharing: isSharing,
      });
      return updated;
    });
    
    // Immediate reallocation for screen share changes
    reallocateBandwidth();
  }, [reallocateBandwidth]);

  const pinParticipant = useCallback((participantId: string, pinned: boolean) => {
    setPriorities(prev => {
      const participant = prev.get(participantId);
      if (!participant) return prev;

      const updated = new Map(prev);
      updated.set(participantId, {
        ...participant,
        isPinned: pinned,
      });
      return updated;
    });
    
    reallocateBandwidth();
  }, [reallocateBandwidth]);

  const setTotalBandwidth = useCallback((bandwidth: number) => {
    configRef.current.totalBandwidth = bandwidth;
    setAllocation(prev => ({
      ...prev,
      totalAvailable: bandwidth,
    }));
    reallocateBandwidth();
  }, [reallocateBandwidth]);

  const getTargetBitrate = useCallback((participantId: string): number => {
    const participant = priorities.get(participantId);
    if (!participant) return configRef.current.minQualityBandwidth;
    return participant.allocatedBandwidth;
  }, [priorities]);

  const getTargetResolution = useCallback((participantId: string): { width: number; height: number } => {
    const participant = priorities.get(participantId);
    if (!participant) return QUALITY_PRESETS.medium;
    
    const preset = QUALITY_PRESETS[participant.targetQuality];
    return { width: preset.width, height: preset.height };
  }, [priorities]);

  const forceReallocation = useCallback(() => {
    reallocateBandwidth();
  }, [reallocateBandwidth]);

  return {
    priorities,
    allocation,
    activeSpeakerId,
    addParticipant,
    removeParticipant,
    updateSpeakingState,
    updateScreenShareState,
    pinParticipant,
    setTotalBandwidth,
    getTargetBitrate,
    getTargetResolution,
    forceReallocation,
  };
}
