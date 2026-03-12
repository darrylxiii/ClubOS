import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'sound-effects-enabled';

export const SoundToggle = () => {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch { /* non-critical */ }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="relative group"
      title={enabled ? 'Mute sounds' : 'Enable sounds'}
    >
      {enabled ? (
        <Volume2 className="h-5 w-5 transition-all group-hover:scale-110" />
      ) : (
        <VolumeX className="h-5 w-5 transition-all group-hover:scale-110" />
      )}
    </Button>
  );
};
