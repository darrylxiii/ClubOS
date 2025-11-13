/**
 * Design tokens for Unified Candidate Profile
 * Enterprise-grade visual system with Apple-like aesthetic
 */

export const candidateProfileTokens = {
  // Score color zones
  scores: {
    strong: {
      bg: 'hsl(142, 76%, 36%)',
      text: 'hsl(142, 76%, 96%)',
      range: [80, 100] as const,
    },
    good: {
      bg: 'hsl(48, 96%, 53%)',
      text: 'hsl(48, 96%, 13%)',
      range: [60, 79] as const,
    },
    moderate: {
      bg: 'hsl(33, 100%, 50%)',
      text: 'hsl(33, 100%, 10%)',
      range: [40, 59] as const,
    },
    weak: {
      bg: 'hsl(0, 84%, 60%)',
      text: 'hsl(0, 84%, 100%)',
      range: [0, 39] as const,
    },
  },

  // Layout spacing
  layout: {
    mainWidth: 'max-w-7xl',
    sidebarWidth: 'w-full lg:w-80',
    sectionGap: 'space-y-6',
    cardPadding: 'p-6',
  },

  // Glassmorphic effects
  glass: {
    card: 'bg-card/90 backdrop-blur-xl border border-border/50',
    overlay: 'bg-background/80 backdrop-blur-sm',
    strong: 'bg-card/95 backdrop-blur-2xl',
  },

  // Shadows
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    glow: 'shadow-lg shadow-primary/20',
  },

  // Animations
  animations: {
    spring: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },
    smooth: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
    fast: {
      duration: 0.15,
      ease: 'easeOut' as const,
    },
  },

  // Badge styles
  badges: {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    danger: 'bg-red-500/10 text-red-500 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
};

export const getScoreColor = (score: number) => {
  if (score >= 80) return candidateProfileTokens.scores.strong;
  if (score >= 60) return candidateProfileTokens.scores.good;
  if (score >= 40) return candidateProfileTokens.scores.moderate;
  return candidateProfileTokens.scores.weak;
};
