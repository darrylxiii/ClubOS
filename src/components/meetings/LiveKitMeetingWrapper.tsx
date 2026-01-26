import { useEffect, useState, useRef } from 'react';
import { useLiveKitMeeting } from '@/hooks/useLiveKitMeeting';
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    LayoutContextProvider,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi } from 'lucide-react';

interface LiveKitMeetingWrapperProps {
    meetingId: string;
    participantName: string;
    participantId: string;
    isHost: boolean;
    onEnd: () => void;
    onFallbackToWebRTC?: () => void;
    className?: string;
}

export function LiveKitMeetingWrapper({
    meetingId,
    participantName,
    participantId,
    isHost,
    onEnd,
    onFallbackToWebRTC,
    className
}: LiveKitMeetingWrapperProps) {
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const [showFallbackOption, setShowFallbackOption] = useState(false);
    const connectionStartTime = useRef<number>(Date.now());

    const {
        token,
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
        roomName,
    } = useLiveKitMeeting({
        roomName: meetingId,
        participantName,
        participantId,
        isHost,
        onConnectionStateChange: (state) => {
            if (state === 'disconnected') {
                onEnd();
            }
        }
    });

    // Auto-connect when component mounts
    useEffect(() => {
        connectionStartTime.current = Date.now();
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    // CRITICAL FIX: Use mount-once timers that DO NOT depend on state changes
    // This prevents the timer from resetting when isConnecting/token changes
    useEffect(() => {
        const mountTime = Date.now();
        console.log('[LiveKit] ⏱️ Starting connection timers at', new Date().toISOString());

        // Soft timeout: Show fallback option at 15 seconds
        const softTimer = setTimeout(() => {
            const elapsed = Date.now() - mountTime;
            console.warn(`[LiveKit] ⏱️ Soft timeout at ${elapsed}ms - showing fallback option`);
            setShowFallbackOption(true);
        }, 15000);

        // Hard timeout: Auto-fallback at 30 seconds
        const hardTimer = setTimeout(() => {
            const elapsed = Date.now() - mountTime;
            console.error(`[LiveKit] ⏱️ Hard timeout at ${elapsed}ms - forcing WebRTC fallback`);
            if (onFallbackToWebRTC) {
                onFallbackToWebRTC();
            }
        }, 30000);

        return () => {
            console.log('[LiveKit] 🧹 Clearing connection timers');
            clearTimeout(softTimer);
            clearTimeout(hardTimer);
        };
    }, [onFallbackToWebRTC]); // Only depends on callback, not on state

    // Success detector: Clear fallback option when connected
    useEffect(() => {
        if (token && !isConnecting) {
            console.log('[LiveKit] ✅ Connection successful - clearing fallback option');
            setShowFallbackOption(false);
        }
    }, [token, isConnecting]);

    const handleRetry = () => {
        setConnectionAttempts(prev => prev + 1);
        setShowFallbackOption(false);
        connectionStartTime.current = Date.now();
        connect();
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-background border rounded-lg p-6">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <Wifi className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold text-destructive mb-2">Connection Failed</h3>
                <p className="text-muted-foreground mb-4 text-center max-w-md">
                    {error.includes('LiveKit not configured') 
                        ? 'Video infrastructure is temporarily unavailable.'
                        : error.includes('Token generation failed') || error.includes('after 3 attempts')
                            ? 'Failed to establish secure connection. Please try again.'
                            : error
                    }
                </p>
                <div className="flex gap-3">
                    <Button
                        onClick={handleRetry}
                        variant="default"
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Retry Connection
                    </Button>
                    {onFallbackToWebRTC && (
                        <Button
                            onClick={onFallbackToWebRTC}
                            variant="outline"
                        >
                            Use Direct Mode
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    if (isConnecting || !token) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-background border rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Connecting to secure room...</p>
                
                {connectionAttempts > 0 && (
                    <p className="text-xs text-muted-foreground/60 mt-2">
                        Attempt {connectionAttempts + 1}
                    </p>
                )}

                {showFallbackOption && (
                    <div className="mt-6 flex flex-col items-center gap-3 animate-in fade-in duration-300">
                        <p className="text-sm text-amber-500">
                            Connection taking longer than expected...
                        </p>
                        <div className="flex gap-2">
                            {onFallbackToWebRTC && (
                                <Button 
                                    variant="outline"
                                    onClick={onFallbackToWebRTC}
                                    size="sm"
                                >
                                    Switch to Direct Mode
                                </Button>
                            )}
                            <Button 
                                variant="ghost"
                                onClick={handleRetry}
                                size="sm"
                                className="gap-1"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Keep Trying
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`relative h-full w-full ${className || ''}`}>
            <LayoutContextProvider>
                <LiveKitRoom
                    token={token}
                    serverUrl="https://thequantumclub-os.livekit.cloud"
                    connect={true}
                    data-lk-theme="default"
                    className="h-full w-full"
                    onDisconnected={onEnd}
                >
                    <VideoConference />
                    <RoomAudioRenderer />
                </LiveKitRoom>
            </LayoutContextProvider>
        </div>
    );
}
