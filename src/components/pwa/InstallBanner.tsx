import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { IOSInstallInstructions } from './IOSInstallInstructions';

export function InstallBanner() {
  const { canInstall, promptInstall, isInstalled } = useInstallPrompt();
  const isMobile = useMobileDetection();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const isDismissed = localStorage.getItem('pwa-install-dismissed');
    if (isDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      await promptInstall();
      handleDismiss();
    }
  };

  // Show banner for iOS users (even without canInstall) or Android with canInstall
  if (!isMobile || dismissed || isInstalled) {
    return null;
  }
  
  if (!isIOS && !canInstall) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-card border border-border rounded-lg shadow-2xl p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            
            <div className="flex-1 pr-6">
              <h3 className="font-semibold text-sm mb-1">
                Install The Quantum Club
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {isIOS 
                  ? "Add to your home screen for instant access"
                  : "Get faster access and work offline. Install our app in one tap."
                }
              </p>
              
              <Button 
                onClick={handleInstall}
                size="sm"
                className="w-full bg-gold hover:bg-gold/90"
              >
                <Download className="w-4 h-4 mr-2" />
                {isIOS ? "View Instructions" : "Install App"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <IOSInstallInstructions 
        open={showIOSInstructions} 
        onOpenChange={setShowIOSInstructions} 
      />
    </>
  );
}
