/**
 * Shared Animation Variants - Phase 15: Framer Motion Consolidation
 * Centralized animation definitions to improve tree-shaking and reduce duplication
 * ~10KB optimized through consistent reuse
 */

import type { Variants, Transition } from 'framer-motion';

// ============================================================================
// TRANSITIONS - Reusable timing configurations
// ============================================================================

export const transitions = {
  /** Fast micro-interaction */
  fast: { duration: 0.15, ease: 'easeOut' } as Transition,
  /** Standard interaction */
  normal: { duration: 0.2, ease: 'easeOut' } as Transition,
  /** Smooth entrance/exit */
  smooth: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } as Transition,
  /** Spring for bouncy interactions */
  spring: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  /** Gentle spring for subtle motion */
  gentleSpring: { type: 'spring', stiffness: 200, damping: 25 } as Transition,
} as const;

// ============================================================================
// FADE VARIANTS
// ============================================================================

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.smooth },
  exit: { opacity: 0, transition: transitions.fast },
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: transitions.smooth },
  exit: { opacity: 0, y: 10, transition: transitions.fast },
};

export const fadeDownVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: transitions.smooth },
  exit: { opacity: 0, y: -10, transition: transitions.fast },
};

export const fadeScaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: transitions.smooth },
  exit: { opacity: 0, scale: 0.95, transition: transitions.fast },
};

// ============================================================================
// SLIDE VARIANTS
// ============================================================================

export const slideInRightVariants: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: transitions.smooth },
  exit: { x: '100%', opacity: 0, transition: transitions.smooth },
};

export const slideInLeftVariants: Variants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: transitions.smooth },
  exit: { x: '-100%', opacity: 0, transition: transitions.smooth },
};

export const slideInUpVariants: Variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: transitions.smooth },
  exit: { y: '100%', opacity: 0, transition: transitions.smooth },
};

export const slideInDownVariants: Variants = {
  hidden: { y: '-100%', opacity: 0 },
  visible: { y: 0, opacity: 1, transition: transitions.smooth },
  exit: { y: '-100%', opacity: 0, transition: transitions.smooth },
};

// ============================================================================
// SCALE VARIANTS
// ============================================================================

export const scaleVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: transitions.spring },
  exit: { scale: 0.8, opacity: 0, transition: transitions.fast },
};

export const popVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: transitions.spring },
  exit: { scale: 0, opacity: 0, transition: transitions.fast },
};

// ============================================================================
// STAGGER CONTAINER VARIANTS
// ============================================================================

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitions.smooth },
  exit: { opacity: 0, y: 20 },
};

// ============================================================================
// DIALOG / MODAL VARIANTS
// ============================================================================

export const dialogOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const dialogContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: transitions.spring 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10, 
    transition: transitions.fast 
  },
};

// ============================================================================
// DRAWER / SHEET VARIANTS
// ============================================================================

export const drawerVariants: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: transitions.smooth },
  exit: { x: '100%', transition: transitions.smooth },
};

export const bottomSheetVariants: Variants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: transitions.smooth },
  exit: { y: '100%', transition: transitions.smooth },
};

// ============================================================================
// HOVER / TAP VARIANTS
// ============================================================================

export const hoverScaleVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

export const hoverLiftVariants = {
  initial: { y: 0, boxShadow: '0 0 0 rgba(0,0,0,0)' },
  hover: { y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
};

export const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

// ============================================================================
// ACCORDION / COLLAPSE VARIANTS
// ============================================================================

export const accordionVariants: Variants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { 
    height: 'auto', 
    opacity: 1, 
    transition: { duration: 0.2, ease: 'easeOut' } 
  },
};

// ============================================================================
// NOTIFICATION / TOAST VARIANTS
// ============================================================================

export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: transitions.spring 
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    transition: transitions.fast 
  },
};

// ============================================================================
// CARD VARIANTS
// ============================================================================

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitions.smooth },
  hover: { y: -4, transition: transitions.fast },
};

// ============================================================================
// LIST ITEM VARIANTS
// ============================================================================

export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: transitions.smooth },
  exit: { opacity: 0, x: 20, transition: transitions.fast },
};

// ============================================================================
// SKELETON / LOADING VARIANTS
// ============================================================================

export const pulseVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const shimmerVariants: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create stagger container with custom timing
 */
export function createStaggerContainer(
  staggerChildren = 0.05,
  delayChildren = 0.1
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren, delayChildren },
    },
    exit: {
      opacity: 0,
      transition: { staggerChildren: staggerChildren / 2, staggerDirection: -1 },
    },
  };
}

/**
 * Create fade variant with custom y offset
 */
export function createFadeUpVariant(yOffset = 20): Variants {
  return {
    hidden: { opacity: 0, y: yOffset },
    visible: { opacity: 1, y: 0, transition: transitions.smooth },
    exit: { opacity: 0, y: yOffset, transition: transitions.fast },
  };
}
