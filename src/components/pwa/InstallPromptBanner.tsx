import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export function InstallPromptBanner() {
  const { isInstallable, isIOS, isInstalled, promptInstall, dismissPrompt } = useInstallPrompt();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if already installed or not installable
  if (isInstalled || (!isInstallable && !isIOS)) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setIsExpanded(true);
    } else {
      const result = await promptInstall();
      if (result.outcome === 'accepted') {
        // Success handled by hook
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden">
          {!isExpanded ? (
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">
                    Install The Quantum Club
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get the app for a faster, native-like experience
                  </p>
                </div>
                <button
                  onClick={dismissPrompt}
                  className="p-1 hover:bg-muted rounded-md transition-colors shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="flex-1 gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isIOS ? 'How to Install' : 'Install App'}
                </Button>
                <Button
                  onClick={dismissPrompt}
                  variant="ghost"
                  size="sm"
                >
                  Not now
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">
                  Install on iOS
                </h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <ol className="text-xs text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  <span>
                    Tap the <strong className="text-foreground">Share</strong> button in Safari
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  <span>
                    Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">3.</span>
                  <span>
                    Tap <strong className="text-foreground">"Add"</strong> to confirm
                  </span>
                </li>
              </ol>
              <Button
                onClick={dismissPrompt}
                variant="outline"
                size="sm"
                className="w-full mt-3"
              >
                Got it
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
