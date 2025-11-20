import { Share, Plus, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface IOSInstallInstructionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IOSInstallInstructions({ open, onOpenChange }: IOSInstallInstructionsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Install on iPhone
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To install The Quantum Club on your iPhone:
          </p>
          
          <ol className="space-y-3">
            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Tap the Share button</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Look for <Share className="w-3 h-3 inline" /> in Safari's toolbar
                </p>
              </div>
            </li>
            
            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Select "Add to Home Screen"</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scroll down and tap <Plus className="w-3 h-3 inline" /> Add to Home Screen
                </p>
              </div>
            </li>
            
            <li className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Confirm installation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap "Add" in the top right corner
                </p>
              </div>
            </li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
