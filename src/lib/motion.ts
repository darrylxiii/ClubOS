// Barrel re-export for framer-motion to reduce Rollup module graph edges.
// All 184 import sites reference this single file instead of framer-motion directly.
export {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useTransform,
  useDragControls,
  useSpring,
  useInView,
} from 'framer-motion';

export type { PanInfo } from 'framer-motion';
