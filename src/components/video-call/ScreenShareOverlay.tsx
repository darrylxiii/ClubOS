/**
 * @deprecated This component has been replaced by PresenterHUD
 * Kept for backward compatibility only
 */
import { useTranslation } from 'react-i18next';
import { Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScreenShareOverlayProps {
  participantName: string;
}

export function ScreenShareOverlay({ participantName }: ScreenShareOverlayProps) {
  const { t } = useTranslation('common');
  // Simple black screen with icon - actual presenter HUD is now in PresenterHUD component
  return (
    <div className={cn(
      "absolute inset-0 bg-black/95 backdrop-blur-xl z-10",
      "flex items-center justify-center"
    )}>
      <div className="text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mx-auto">
          <Monitor className="h-12 w-12 text-white/80" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">
            {t('meetings.yourePresenting', "You're Presenting")}
          </h3>
          <p className="text-sm text-white/60 max-w-md">
            {t('meetings.screenBeingShared', 'Your screen is being shared with all participants')}
          </p>
        </div>
      </div>
    </div>
  );
}
