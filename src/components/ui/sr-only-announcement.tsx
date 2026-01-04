import { useEffect } from 'react';

interface SrOnlyAnnouncementProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

/**
 * Component that announces messages to screen readers
 * Renders a visually hidden live region
 */
export function SrOnlyAnnouncement({ message, priority = 'polite' }: SrOnlyAnnouncementProps) {
  useEffect(() => {
    // This component's mere presence with a message triggers the announcement
  }, [message]);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Static live region for dynamic announcements
 * Place once at app root, then use useAnnounce hook to trigger
 */
export function LiveRegion() {
  return (
    <div
      id="sr-live-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
