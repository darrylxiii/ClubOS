import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'sound-effects-enabled';

export const SoundToggle = () => {
  const { t } = useTranslation('common');
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
      className="relative overflow-hidden group rounded-full w-9 h-9 hover:bg-white/10 dark:hover:bg-white/5 transition-all"
      title={enabled ? t('actions.muteSounds', 'Mute sounds') : t('actions.enableSounds', 'Enable sounds')}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={enabled ? "on" : "off"}
          initial={{ y: -20, opacity: 0, rotate: -90, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
          exit={{ y: 20, opacity: 0, rotate: 90, scale: 0.8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {enabled ? (
            <Volume2 className="h-4 w-4 text-primary transition-colors" />
          ) : (
            <VolumeX className="h-4 w-4 text-muted-foreground transition-colors" />
          )}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
};
