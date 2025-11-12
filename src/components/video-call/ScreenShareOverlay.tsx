/**
 * @deprecated This component has been replaced by PresenterHUD
 * Kept for backward compatibility only
 */
import { Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScreenShareOverlayProps {
  participantName: string;
}

export function ScreenShareOverlay({ participantName }: ScreenShareOverlayProps) {
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
            You're Presenting
          </h3>
          <p className="text-sm text-white/60 max-w-md">
            Your screen is being shared with all participants
          </p>
        </div>
      </div>
    </div>
  );
}
