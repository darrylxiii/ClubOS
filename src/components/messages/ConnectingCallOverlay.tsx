import { createPortal } from 'react-dom';
import { UnifiedLoader } from '@/components/ui/unified-loader';

interface ConnectingCallOverlayProps {
  callType?: 'audio' | 'video';
}

export function ConnectingCallOverlay({ callType = 'video' }: ConnectingCallOverlayProps) {
  return createPortal(
    <UnifiedLoader variant="overlay" text={`Connecting to ${callType} call...`} />,
    document.body
  );
}
