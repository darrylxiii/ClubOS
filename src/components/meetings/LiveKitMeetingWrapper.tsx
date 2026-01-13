import { useEffect, useState, lazy, Suspense, ComponentType } from 'react';
import { useLiveKitMeeting } from '@/hooks/useLiveKitMeeting';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load LiveKit components
const LazyLiveKitRoom = lazy(() => 
  import('@livekit/components-react').then(mod => ({ default: mod.LiveKitRoom }))
);
const LazyVideoConference = lazy(() => 
  import('@livekit/components-react').then(mod => ({ default: mod.VideoConference }))
);
const LazyRoomAudioRenderer = lazy(() => 
  import('@livekit/components-react').then(mod => ({ default: mod.RoomAudioRenderer }))
);
const LazyLayoutContextProvider = lazy(() => 
  import('@livekit/components-react').then(mod => ({ default: mod.LayoutContextProvider }))
);

// Loading skeleton for meeting room
function MeetingLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-background border rounded-lg">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p className="text-muted-foreground">Loading meeting room...</p>
    </div>
  );
}

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
  const [stylesLoaded, setStylesLoaded] = useState(false);
  
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

  // Dynamically load LiveKit styles only when needed
  useEffect(() => {
    import('@livekit/components-styles').then(() => {
      setStylesLoaded(true);
    });
  }, []);

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

  if (isConnecting || !token || !stylesLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-background border rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Connecting to secure room...</p>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${className || ''}`}>
      <Suspense fallback={<MeetingLoadingSkeleton />}>
        <LazyLayoutContextProvider>
          <LazyLiveKitRoom
            token={token}
            serverUrl="https://thequantumclub-os.livekit.cloud" // TODO: Use env var
            connect={true}
            data-lk-theme="default"
            className="h-full w-full"
            onDisconnected={onEnd}
          >
            <LazyVideoConference />
            <LazyRoomAudioRenderer />
          </LazyLiveKitRoom>
        </LazyLayoutContextProvider>
      </Suspense>
    </div>
  );
}
