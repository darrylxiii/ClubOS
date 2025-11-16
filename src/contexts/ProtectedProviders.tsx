import { ReactNode, lazy, Suspense } from "react";
import { RoleProvider } from "@/contexts/RoleContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import { NavigationHistoryProvider } from "@/contexts/NavigationHistoryContext";
import { MotionProvider } from "@/contexts/MotionContext";
import { FloatingVideoPlayer } from "@/components/FloatingVideoPlayer";
import { ActivityTracker } from "@/components/ActivityTracker";
import { Loader2 } from "lucide-react";

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
    <RoleProvider>
      <SubscriptionProvider>
        <VideoPlayerProvider>
          <NavigationHistoryProvider>
            <MotionProvider>
              <ActivityTracker>
                <FloatingVideoPlayer />
                {children}
              </ActivityTracker>
            </MotionProvider>
          </NavigationHistoryProvider>
        </VideoPlayerProvider>
      </SubscriptionProvider>
    </RoleProvider>
  );
};

// Loading fallback for protected provider lazy load
export const ProtectedProvidersLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);
