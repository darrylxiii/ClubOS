import { useIdleSessionTimeout } from '@/hooks/useIdleSessionTimeout';

/**
 * Invisible component that monitors user activity and signs out
 * after 30 minutes of inactivity. Shows a warning 2 minutes before.
 */
export const IdleSessionGuard = () => {
  useIdleSessionTimeout();
  return null;
};
