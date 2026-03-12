import { useEffect, useState } from 'react';
import { motion, useSpring } from '@/lib/motion';
import { useMotion } from '@/contexts/MotionContext';

/**
 * A subtle trailing dot that follows the cursor with spring physics.
 * Desktop only (pointer: fine). Respects MotionContext + prefers-reduced-motion.
 */
export const CursorTrail = () => {
  const { motionEnabled } = useMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  const springX = useSpring(0, { stiffness: 150, damping: 15 });
  const springY = useSpring(0, { stiffness: 150, damping: 15 });

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsDesktop(mq.matches && !mqMotion.matches);

    const handleChange = () => setIsDesktop(mq.matches && !mqMotion.matches);
    mq.addEventListener('change', handleChange);
    mqMotion.addEventListener('change', handleChange);
    return () => {
      mq.removeEventListener('change', handleChange);
      mqMotion.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (!isDesktop || !motionEnabled) return;

    const onMove = (e: MouseEvent) => {
      springX.set(e.clientX);
      springY.set(e.clientY);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [isDesktop, motionEnabled, springX, springY]);

  if (!isDesktop || !motionEnabled) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none rounded-full"
      style={{
        x: springX,
        y: springY,
        width: 6,
        height: 6,
        backgroundColor: 'hsl(var(--foreground) / 0.15)',
        translateX: '-50%',
        translateY: '-50%',
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
};
