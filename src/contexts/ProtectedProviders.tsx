import { ReactNode } from "react";
import { RoleProvider } from "@/contexts/RoleContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { NavigationHistoryProvider } from "@/contexts/NavigationHistoryContext";
import { MotionProvider } from "@/contexts/MotionContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { UserStatusProvider } from "@/contexts/UserStatusContext";
import { FloatingVideoPlayer } from "@/components/FloatingVideoPlayer";
import { ActivityTracker } from "@/components/ActivityTracker";
import { TrackingProvider } from "@/components/tracking/TrackingProvider";
import { NavigationTracer } from "@/components/tracing/NavigationTracer";
import { UnifiedLoader } from "@/components/ui/unified-loader";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ProtectedProvidersProps {
  children: ReactNode;
}

/**
 * Heavy providers for protected routes loaded AFTER authentication
 * Includes role management, subscriptions, video player, and activity tracking
 * Lazy loaded to reduce initial bundle size and improve FCP
 * 
 * Optimization: TooltipProvider moved here from App.tsx to reduce
 * provider nesting for public routes
 */
export const ProtectedProviders = ({ children }: ProtectedProvidersProps) => {
  return (
    <TooltipProvider>
      <UserStatusProvider>
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
      </UserStatusProvider>
    </TooltipProvider>
  );
};

// Loading fallback for protected provider lazy load
export const ProtectedProvidersLoader = () => (
  <UnifiedLoader variant="page" text="Initializing..." />
);
