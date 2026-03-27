import { Play, Pause } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { useMotion } from "@/contexts/MotionContext";
import { motion, AnimatePresence } from "framer-motion";

export const MotionToggle = () => {
  const { t } = useTranslation('common');
  const { motionEnabled, toggleMotion } = useMotion();

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={toggleMotion}
      className={`relative overflow-hidden group rounded-full w-9 h-9 hover:bg-white/10 dark:hover:bg-white/5 transition-all ${motionEnabled ? 'shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]' : ''}`}
      title={motionEnabled ? t('motion.pause', 'Pause motion') : t('motion.play', 'Play motion')}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={motionEnabled ? "play" : "pause"}
          initial={{ rotateY: 180, opacity: 0, scale: 0.8 }}
          animate={{ rotateY: 0, opacity: 1, scale: 1 }}
          exit={{ rotateY: -180, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.25, type: "spring", stiffness: 300, damping: 20 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {motionEnabled ? (
            <Pause className="h-4 w-4 text-primary" />
          ) : (
            <Play className="h-4 w-4 text-muted-foreground" />
          )}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
};
