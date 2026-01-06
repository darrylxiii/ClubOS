import { useEffect } from 'react';
import { useLiveKitMeeting } from '@/hooks/useLiveKitMeeting';
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    LayoutContextProvider,
} from '@livekit/components-react';
import '@livekit/components-styles';

interface LiveKitMeetingWrapperProps {
    meetingId: string;
    participantName: string;
    participantId: string;
    isHost: boolean;
    onEnd: () => void;
    className?: string;
}

export function LiveKitMeetingWrapper({
    meetingId,
    participantName,
    participantId,
    isHost,
    onEnd,
    className
}: LiveKitMeetingWrapperProps) {
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
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-background border rounded-lg p-6">
                <h3 className="text-xl font-semibold text-destructive mb-2">Connection Failed</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <button
                    onClick={() => connect()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    if (isConnecting || !token) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-background border rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Connecting to secure room...</p>
            </div>
        );
    }

    return (
        <div className={`relative h-full w-full ${className || ''}`}>
            <LayoutContextProvider>
                <LiveKitRoom
                    token={token}
                    serverUrl="https://thequantumclub-os.livekit.cloud" // TODO: Use env var
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
