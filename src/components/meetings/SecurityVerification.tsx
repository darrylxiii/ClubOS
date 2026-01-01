/**
 * Security Verification Component
 * Visual E2EE verification UI with security codes and emoji comparison
 */

import { useState } from 'react';
import { ShieldCheck, ShieldOff, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SecurityVerificationProps {
  securityCode?: string;
  emojis?: string[];
  isVerified: boolean;
  peerName: string;
  peerId: string;
  onVerify: (verified: boolean) => void;
}

export function SecurityVerification({
  securityCode,
  emojis = [],
  isVerified,
  peerName,
  peerId,
  onVerify
}: SecurityVerificationProps) {
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCopyCode = async () => {
    if (securityCode) {
      await navigator.clipboard.writeText(securityCode);
      setCopied(true);
      toast.success('Security code copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = () => {
    onVerify(true);
    setDialogOpen(false);
    toast.success(`Connection with ${peerName} verified`);
  };

  const handleReject = () => {
    onVerify(false);
    setDialogOpen(false);
    toast.error('Verification failed - connection may not be secure');
  };

  if (!securityCode) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <ShieldOff className="h-3 w-3" />
              <span className="text-xs">No E2EE</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>End-to-end encryption is not available</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            "gap-1.5 h-7",
            isVerified 
              ? "text-emerald-500 hover:text-emerald-600" 
              : "text-amber-500 hover:text-amber-600"
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">
            {isVerified ? 'Verified' : 'Verify'}
          </span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Verify Security with {peerName}
          </DialogTitle>
          <DialogDescription>
            Compare these security codes with {peerName} to verify your connection is truly end-to-end encrypted.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Emoji verification */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Visual verification
            </p>
            <div className="flex justify-center gap-2 text-3xl p-4 bg-muted/50 rounded-lg">
              {emojis.map((emoji, i) => (
                <span key={i} className="animate-in fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  {emoji}
                </span>
              ))}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Ask {peerName} if they see the same emojis
            </p>
          </div>

          {/* Numeric code */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Security code
            </p>
            <div className="relative">
              <div className="font-mono text-lg tracking-widest text-center p-4 bg-muted/50 rounded-lg">
                {securityCode}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Both participants should see identical codes
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              If the codes don't match, someone may be intercepting your call. 
              Do not share sensitive information.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleReject}>
            Codes Don't Match
          </Button>
          <Button 
            onClick={handleVerify}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            Codes Match
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
