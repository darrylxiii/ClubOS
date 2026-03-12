import { ReactNode } from 'react';
import { AnimatePresence, motion } from '@/lib/motion';
import { useMotion } from '@/contexts/MotionContext';

interface SkeletonCrossfadeProps {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}

/**
 * Crossfades between skeleton and real content.
 * Overlaps exit/enter for 200ms for a smooth hand-off.
 */
export const SkeletonCrossfade = ({ loading, skeleton, children }: SkeletonCrossfadeProps) => {
  const { motionEnabled } = useMotion();

  if (!motionEnabled) {
    return <>{loading ? skeleton : children}</>;
  }

  return (
    <AnimatePresence mode="popLayout">
      {loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeIn' }}
        >
          {skeleton}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
