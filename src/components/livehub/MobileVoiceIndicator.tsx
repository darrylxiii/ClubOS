import { Volume2, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/hooks/useHaptics';

interface MobileVoiceIndicatorProps {
  channelName: string;
  onTap: () => void;
  onDisconnect: () => void;
}

const MobileVoiceIndicator = ({ channelName, onTap, onDisconnect }: MobileVoiceIndicatorProps) => {
  const { impact } = useHaptics();
  
  return (
    <div 
      className="fixed bottom-20 left-4 right-4 bg-green-500/90 rounded-xl p-3 flex items-center justify-between shadow-lg z-40 safe-area-bottom"
      onClick={onTap}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
          <Volume2 className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-medium text-sm">Voice Connected</p>
          <p className="text-white/80 text-xs truncate">{channelName}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-white hover:bg-white/20 shrink-0 ml-2"
        onClick={(e) => {
          e.stopPropagation();
          impact('medium');
          onDisconnect();
        }}
      >
        <PhoneOff className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default MobileVoiceIndicator;
