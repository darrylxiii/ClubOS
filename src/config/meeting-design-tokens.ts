/**
 * Meeting Design Tokens
 * Enterprise-grade design system for video call interfaces
 */

export const meetingZIndex = {
  videoGrid: 10,
  controls: 50,
  panels: 100,
  modals: 200,
  toasts: 300,
  dropdown: 10100,
} as const;

export const meetingAnimations = {
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  quick: {
    duration: 0.2,
    ease: 'easeOut',
  },
  smooth: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1],
  },
  slow: {
    duration: 0.5,
    ease: [0.4, 0, 0.2, 1],
  },
} as const;

export const meetingShadows = {
  sm: '0_4px_12px_rgba(0,0,0,0.15)',
  md: '0_8px_24px_rgba(0,0,0,0.25)',
  lg: '0_12px_48px_rgba(0,0,0,0.4)',
  xl: '0_16px_64px_rgba(0,0,0,0.5)',
  glow: '0_0_32px_rgba(var(--primary)/0.4)',
  glowRed: '0_0_24px_rgba(244,63,94,0.5)',
  glowGreen: '0_0_32px_rgba(34,197,94,0.3)',
  glowYellow: '0_0_24px_rgba(234,179,8,0.5)',
  glowAmber: '0_0_24px_rgba(245,158,11,0.4)',
} as const;

export const meetingBackdrop = {
  light: 'bg-white/10 backdrop-blur-xl',
  medium: 'bg-black/40 backdrop-blur-2xl',
  heavy: 'bg-black/60 backdrop-blur-3xl',
  dark: 'bg-black/90 backdrop-blur-3xl',
} as const;

export const meetingBorders = {
  subtle: 'border border-white/10',
  medium: 'border border-white/20',
  strong: 'border border-white/30',
} as const;

export const meetingInteractions = {
  hoverScale: 'hover:scale-110 active:scale-95 transition-all duration-300',
  tapScale: 'hover:scale-105 active:scale-95 transition-all duration-200',
  wiggle: 'hover:rotate-3 transition-transform duration-200',
  glow: 'hover:shadow-[0_0_24px_rgba(var(--primary)/0.5)] transition-shadow duration-300',
} as const;
