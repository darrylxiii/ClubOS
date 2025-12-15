import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useVoiceChannel } from '@/hooks/useVoiceChannel';

interface ActiveCallContextType {
    activeChannelId: string | null;
    joinCall: (channelId: string) => void;
    leaveCall: () => void;
    toggleMinimize: () => void;
    isMinimized: boolean; // Is the user looking at something else?
    voice: ReturnType<typeof useVoiceChannel>;
}

const ActiveCallContext = createContext<ActiveCallContextType | undefined>(undefined);

export const ActiveCallProvider = ({ children }: { children: ReactNode }) => {
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    // Initialize the hook with the active channel ID (or null)
    // We enable PTT by default for now, can be parameterized later
    const voice = useVoiceChannel(activeChannelId, { pushToTalkEnabled: false });

    const joinCall = useCallback((channelId: string) => {
        if (activeChannelId === channelId) return; // Already in this channel

        // If we're already in a different channel, the hook's useEffects will handle transition 
        // because channelId prop changes. But we might want to be explicit.
        setActiveChannelId(channelId);
        setIsMinimized(false); // When joining, show the full view initially
    }, [activeChannelId]);

    const leaveCall = useCallback(() => {
        voice.leaveChannel();
        setActiveChannelId(null);
        setIsMinimized(false);
    }, [voice]);

    const toggleMinimize = useCallback(() => {
        setIsMinimized(prev => !prev);
    }, []);

    const value = React.useMemo(() => ({
        activeChannelId,
        joinCall,
        leaveCall,
        toggleMinimize,
        isMinimized,
        voice
    }), [activeChannelId, joinCall, leaveCall, toggleMinimize, isMinimized, voice]);

    return (
        <ActiveCallContext.Provider value={value}>
            {children}
        </ActiveCallContext.Provider>
    );
};

export const useActiveCall = () => {
    const context = useContext(ActiveCallContext);
    if (context === undefined) {
        throw new Error('useActiveCall must be used within an ActiveCallProvider');
    }
    return context;
};
