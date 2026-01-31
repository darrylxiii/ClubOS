import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { motion, AnimatePresence } from "framer-motion";

const DISMISSED_KEY = 'tqc_push_notification_prompt_dismissed';
const DELAY_MS = 5000; // Show after 5 seconds on page

interface PushNotificationOptInProps {
  className?: string;
}

export const PushNotificationOptIn = ({ className }: PushNotificationOptInProps) => {
  const { permissionGranted, requestPermission, isNative } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const wasDismissed = localStorage.getItem(DISMISSED_KEY);
    
    // Don't show if:
    // 1. Already granted permission
    // 2. Previously dismissed
    // 3. Not on native platform and no web notification support
    if (permissionGranted || wasDismissed) {
      return;
    }

    // Check if web notifications are supported
    const hasNotificationSupport = isNative || 'Notification' in window;
    if (!hasNotificationSupport) {
      return;
    }

    // Show after delay
    const timer = setTimeout(() => {
      setVisible(true);
    }, DELAY_MS);

    return () => clearTimeout(timer);
  }, [permissionGranted, isNative]);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        setVisible(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  // If permission already granted, don't render
  if (permissionGranted) {
    return null;
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={className}
        >
          <Card className="glass-strong border-primary/20 shadow-glass-lg relative overflow-hidden">
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-accent" />
            
            <CardContent className="p-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={handleDismiss}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="flex items-start gap-4 pr-8">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="h-6 w-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1">
                    Stay in the loop
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Get notified about interview invites, job matches, and messages from recruiters.
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleEnable}
                      disabled={loading}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {loading ? "Enabling..." : "Enable Notifications"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                    >
                      Maybe Later
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
