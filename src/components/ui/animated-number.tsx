import { useRef, useEffect } from 'react';
import { useSpring, useInView, motion } from '@/lib/motion';
import { useMotion } from '@/contexts/MotionContext';

interface AnimatedNumberProps {
  value: number;
  format?: (v: number) => string;
  className?: string;
}

/**
 * Physics-based animated number using framer-motion spring.
 * Triggers when element enters viewport. Respects MotionContext.
 */
export const AnimatedNumber = ({
  value,
  format = (v) => Math.round(v).toLocaleString(),
  className,
}: AnimatedNumberProps) => {
  const { motionEnabled } = useMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  const spring = useSpring(0, { stiffness: 50, damping: 25 });

  useEffect(() => {
    if (isInView && motionEnabled) {
      spring.set(value);
    } else if (!motionEnabled) {
      spring.jump(value);
    }
  }, [value, isInView, motionEnabled, spring]);

  if (!motionEnabled) {
    return <span className={className}>{format(value)}</span>;
  }

  return (
    <motion.span ref={ref} className={className}>
      {/* Use a subscribing component to avoid re-renders */}
      <SpringValue spring={spring} format={format} />
    </motion.span>
  );
};

function SpringValue({
  spring,
  format,
}: {
  spring: any;
  format: (v: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const unsubscribe = spring.on('change', (v: number) => {
      if (ref.current) {
        ref.current.textContent = format(v);
      }
    });
    return unsubscribe;
  }, [spring, format]);

  return <span ref={ref}>0</span>;
}
