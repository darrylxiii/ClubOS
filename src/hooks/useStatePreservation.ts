import { useState, useCallback, useRef, useEffect } from 'react';

interface MeetingState {
  chatMessages: ChatMessage[];
  reactions: Reaction[];
  handRaises: string[];
  pinnedParticipant: string | null;
  screenShareParticipant: string | null;
  mutedParticipants: Set<string>;
  videoOffParticipants: Set<string>;
  participantOrder: string[];
  settings: MeetingSettings;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'reaction';
}

interface Reaction {
  id: string;
  participantId: string;
  emoji: string;
  timestamp: number;
}

interface MeetingSettings {
  isMuted: boolean;
  isVideoOff: boolean;
  selectedAudioDevice: string | null;
  selectedVideoDevice: string | null;
  virtualBackground: string | null;
  noiseSuppressionEnabled: boolean;
  lowLightEnhancementEnabled: boolean;
}

interface UseStatePreservationReturn {
  state: MeetingState;
  saveState: (updates: Partial<MeetingState>) => void;
  restoreState: () => MeetingState | null;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addReaction: (participantId: string, emoji: string) => void;
  toggleHandRaise: (participantId: string) => void;
  setPinnedParticipant: (participantId: string | null) => void;
  setScreenShareParticipant: (participantId: string | null) => void;
  toggleParticipantMute: (participantId: string) => void;
  toggleParticipantVideo: (participantId: string) => void;
  updateSettings: (settings: Partial<MeetingSettings>) => void;
  clearState: () => void;
  exportState: () => string;
  importState: (stateJson: string) => boolean;
}

const STORAGE_KEY = 'meeting_preserved_state';
const MAX_CHAT_MESSAGES = 500;
const MAX_REACTIONS = 100;

const DEFAULT_STATE: MeetingState = {
  chatMessages: [],
  reactions: [],
  handRaises: [],
  pinnedParticipant: null,
  screenShareParticipant: null,
  mutedParticipants: new Set(),
  videoOffParticipants: new Set(),
  participantOrder: [],
  settings: {
    isMuted: false,
    isVideoOff: false,
    selectedAudioDevice: null,
    selectedVideoDevice: null,
    virtualBackground: null,
    noiseSuppressionEnabled: false,
    lowLightEnhancementEnabled: false,
  },
};

export function useStatePreservation(meetingId: string): UseStatePreservationReturn {
  const [state, setState] = useState<MeetingState>(DEFAULT_STATE);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const meetingIdRef = useRef(meetingId);

  useEffect(() => {
    meetingIdRef.current = meetingId;
    // Try to restore state on mount
    const restored = restoreFromStorage();
    if (restored) {
      setState(restored);
    }
  }, [meetingId]);

  // Auto-save state periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      saveToStorage(state);
    }, 5000);

    return () => {
      clearInterval(saveInterval);
      // Save on unmount
      saveToStorage(state);
    };
  }, [state]);

  const getStorageKey = useCallback(() => {
    return `${STORAGE_KEY}_${meetingIdRef.current}`;
  }, []);

  const saveToStorage = useCallback((currentState: MeetingState) => {
    try {
      const serializable = {
        ...currentState,
        mutedParticipants: Array.from(currentState.mutedParticipants),
        videoOffParticipants: Array.from(currentState.videoOffParticipants),
        savedAt: Date.now(),
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to save meeting state:', error);
    }
  }, [getStorageKey]);

  const restoreFromStorage = useCallback((): MeetingState | null => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Check if state is stale (older than 1 hour)
      if (Date.now() - parsed.savedAt > 3600000) {
        localStorage.removeItem(getStorageKey());
        return null;
      }

      return {
        ...parsed,
        mutedParticipants: new Set(parsed.mutedParticipants || []),
        videoOffParticipants: new Set(parsed.videoOffParticipants || []),
      };
    } catch (error) {
      console.error('Failed to restore meeting state:', error);
      return null;
    }
  }, [getStorageKey]);

  const saveState = useCallback((updates: Partial<MeetingState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      
      // Debounced save to storage
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToStorage(newState);
      }, 1000);
      
      return newState;
    });
  }, [saveToStorage]);

  const restoreState = useCallback((): MeetingState | null => {
    const restored = restoreFromStorage();
    if (restored) {
      setState(restored);
    }
    return restored;
  }, [restoreFromStorage]);

  const addChatMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setState(prev => {
      const newMessage: ChatMessage = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      
      const updatedMessages = [...prev.chatMessages, newMessage]
        .slice(-MAX_CHAT_MESSAGES);
      
      return { ...prev, chatMessages: updatedMessages };
    });
  }, []);

  const addReaction = useCallback((participantId: string, emoji: string) => {
    setState(prev => {
      const newReaction: Reaction = {
        id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        participantId,
        emoji,
        timestamp: Date.now(),
      };
      
      const updatedReactions = [...prev.reactions, newReaction]
        .slice(-MAX_REACTIONS);
      
      return { ...prev, reactions: updatedReactions };
    });
  }, []);

  const toggleHandRaise = useCallback((participantId: string) => {
    setState(prev => {
      const isRaised = prev.handRaises.includes(participantId);
      const updatedHandRaises = isRaised
        ? prev.handRaises.filter(id => id !== participantId)
        : [...prev.handRaises, participantId];
      
      return { ...prev, handRaises: updatedHandRaises };
    });
  }, []);

  const setPinnedParticipant = useCallback((participantId: string | null) => {
    setState(prev => ({ ...prev, pinnedParticipant: participantId }));
  }, []);

  const setScreenShareParticipant = useCallback((participantId: string | null) => {
    setState(prev => ({ ...prev, screenShareParticipant: participantId }));
  }, []);

  const toggleParticipantMute = useCallback((participantId: string) => {
    setState(prev => {
      const updatedMuted = new Set(prev.mutedParticipants);
      if (updatedMuted.has(participantId)) {
        updatedMuted.delete(participantId);
      } else {
        updatedMuted.add(participantId);
      }
      return { ...prev, mutedParticipants: updatedMuted };
    });
  }, []);

  const toggleParticipantVideo = useCallback((participantId: string) => {
    setState(prev => {
      const updatedVideoOff = new Set(prev.videoOffParticipants);
      if (updatedVideoOff.has(participantId)) {
        updatedVideoOff.delete(participantId);
      } else {
        updatedVideoOff.add(participantId);
      }
      return { ...prev, videoOffParticipants: updatedVideoOff };
    });
  }, []);

  const updateSettings = useCallback((settings: Partial<MeetingSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  }, []);

  const clearState = useCallback(() => {
    localStorage.removeItem(getStorageKey());
    setState(DEFAULT_STATE);
  }, [getStorageKey]);

  const exportState = useCallback((): string => {
    const serializable = {
      ...state,
      mutedParticipants: Array.from(state.mutedParticipants),
      videoOffParticipants: Array.from(state.videoOffParticipants),
      exportedAt: Date.now(),
    };
    return JSON.stringify(serializable, null, 2);
  }, [state]);

  const importState = useCallback((stateJson: string): boolean => {
    try {
      const parsed = JSON.parse(stateJson);
      const imported: MeetingState = {
        ...parsed,
        mutedParticipants: new Set(parsed.mutedParticipants || []),
        videoOffParticipants: new Set(parsed.videoOffParticipants || []),
      };
      setState(imported);
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }, []);

  return {
    state,
    saveState,
    restoreState,
    addChatMessage,
    addReaction,
    toggleHandRaise,
    setPinnedParticipant,
    setScreenShareParticipant,
    toggleParticipantMute,
    toggleParticipantVideo,
    updateSettings,
    clearState,
    exportState,
    importState,
  };
}
