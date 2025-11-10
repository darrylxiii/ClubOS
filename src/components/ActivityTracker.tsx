import { ReactNode } from 'react';
import { useActivityTracking } from '@/hooks/useActivityTracking';

interface ActivityTrackerProps {
  children: ReactNode;
}

/**
 * Component that wraps the app and automatically tracks user activity
 * Handles online status, activity tracking, and periodic heartbeats
 */
export const ActivityTracker = ({ children }: ActivityTrackerProps) => {
  // Initialize activity tracking
  useActivityTracking();

  return <>{children}</>;
};
