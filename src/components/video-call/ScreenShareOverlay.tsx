import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface ScreenShareOverlayProps {
  participantName: string;
}

export function ScreenShareOverlay({ participantName }: ScreenShareOverlayProps) {
  const [isHidden, setIsHidden] = useState(true);

  if (!isHidden) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-sm z-10 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <EyeOff className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            You're presenting to everyone
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            This view is hidden to prevent infinite loop. Click below to see what others see (may cause feedback).
          </p>
        </div>
        <Button
          onClick={() => setIsHidden(false)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Show My Screen Share
        </Button>
      </div>
    </div>
  );
}
