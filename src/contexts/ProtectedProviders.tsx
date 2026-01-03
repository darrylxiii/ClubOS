import { ReactNode } from "react";
import { RoleProvider } from "@/contexts/RoleContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { NavigationHistoryProvider } from "@/contexts/NavigationHistoryContext";
import { MotionProvider } from "@/contexts/MotionContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { FloatingVideoPlayer } from "@/components/FloatingVideoPlayer";
import { ActivityTracker } from "@/components/ActivityTracker";
import { TrackingProvider } from "@/components/tracking/TrackingProvider";
import { NavigationTracer } from "@/components/tracing/NavigationTracer";
import { UnifiedLoader } from "@/components/ui/unified-loader";

interface ProtectedProvidersProps {
  children: ReactNode;
}

/**
 * Heavy providers for protected routes loaded AFTER authentication
 * Includes role management, subscriptions, video player, and activity tracking
 * Lazy loaded to reduce initial bundle size and improve FCP
 */
export const ProtectedProviders = ({ children }: ProtectedProvidersProps) => {
  return (
    <AppearanceProvider>
      <RoleProvider>
        <SubscriptionProvider>
          <VideoPlayerProvider>
            <NavigationHistoryProvider>
              <MotionProvider>
                <ActivityTracker>
                  <TrackingProvider>
                    <NavigationTracer />
                    <FloatingVideoPlayer />
                    {children}
                  </TrackingProvider>
                </ActivityTracker>
              </MotionProvider>
            </NavigationHistoryProvider>
          </VideoPlayerProvider>
        </SubscriptionProvider>
      </RoleProvider>
    </AppearanceProvider>
  );
};

// Loading fallback for protected provider lazy load
export const ProtectedProvidersLoader = () => (
  <UnifiedLoader variant="page" text="Initializing..." />
);
