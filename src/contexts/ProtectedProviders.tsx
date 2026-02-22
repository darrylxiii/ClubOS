import { ReactNode, useState, useEffect } from "react";
import { RoleProvider } from "@/contexts/RoleContext";
import { TaskBoardProvider } from "@/contexts/TaskBoardContext";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { IdleSessionGuard } from "@/components/IdleSessionGuard";

interface ProtectedProvidersProps {
  children: ReactNode;
}

/**
 * Heavy providers for protected routes loaded AFTER authentication.
 * ActivityTracker and TrackingProvider are deferred to avoid blocking first paint.
 */
export const ProtectedProviders = ({ children }: ProtectedProvidersProps) => {
  const [deferredReady, setDeferredReady] = useState(false);

  // Defer non-critical tracking providers until after first paint
  useEffect(() => {
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => setDeferredReady(true), { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const timeout = setTimeout(() => setDeferredReady(true), 2000);
      return () => clearTimeout(timeout);
    }
  }, []);

  return (
    <TooltipProvider>
      <AppearanceProvider>
        <RoleProvider>
          <TaskBoardProvider>
            <SubscriptionProvider>
              <VideoPlayerProvider>
                <NavigationHistoryProvider>
                  <MotionProvider>
                    <NavigationTracer />
                    <FloatingVideoPlayer />
                    <IdleSessionGuard />
                    {deferredReady && (
                      <ActivityTracker>
                        <TrackingProvider>
                          <></>
                        </TrackingProvider>
                      </ActivityTracker>
                    )}
                    {children}
                  </MotionProvider>
                </NavigationHistoryProvider>
              </VideoPlayerProvider>
            </SubscriptionProvider>
          </TaskBoardProvider>
        </RoleProvider>
      </AppearanceProvider>
    </TooltipProvider>
  );
};

// Loading fallback for protected provider lazy load
export const ProtectedProvidersLoader = () => (
  <UnifiedLoader variant="page" text="Initializing..." />
);
