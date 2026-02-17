/**
 * Lazy-loaded confetti wrapper
 * Dynamically imports canvas-confetti to avoid ~30KB in eager bundle
 */
export const fireConfetti = async (opts?: Record<string, unknown>) => {
  const { default: confetti } = await import('canvas-confetti');
  return confetti(opts as any);
};
