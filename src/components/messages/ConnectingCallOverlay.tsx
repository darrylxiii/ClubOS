import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { UnifiedLoader } from '@/components/ui/unified-loader';

interface ConnectingCallOverlayProps {
  callType?: 'audio' | 'video';
}

export function ConnectingCallOverlay({ callType = 'video' }: ConnectingCallOverlayProps) {
  const { t } = useTranslation('messages');
  return createPortal(
    <UnifiedLoader variant="overlay" text={t('calls.connectingToCall', { type: callType })} />,
    document.body
  );
}
