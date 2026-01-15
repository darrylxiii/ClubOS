
import React from 'react';
import { UnifiedMeetingControls } from '@/components/meetings/UnifiedMeetingControls';
import { ConnectionStatus } from './ConnectionStatus';

interface ControlBarProps {
    channelId: string;
    userId: string;
    userName: string;
    onOpenChat: () => void;
    onOpenParticipants: () => void;
    onOpenSettings: () => void;
    onOpenPerformance?: () => void;
    onOpenPerformance?: () => void;
    className?: string;
    // P2P/External Props
    onToggleMute?: () => void;
    onToggleVideo?: () => void;
    onToggleScreenShare?: () => void;
    onToggleRecording?: () => void;
    onToggleHandRaise?: () => void;
    onLeave?: () => void;
    isMuted?: boolean;
    isVideoOn?: boolean;
    isScreenSharing?: boolean;
    isRecording?: boolean;
    handRaised?: boolean;
}

export const ControlBar = (props: ControlBarProps) => {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 mb-2">
                {/* Reliability Indicator placed above the controls */}
                <ConnectionStatus />
            </div>
            <UnifiedMeetingControls {...props} />
        </div>
    );
};
