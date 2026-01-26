import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Mail, 
  Smartphone, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { migrateToast as toast } from '@/lib/notify';
import { formatRelativeTime } from '@/lib/format';

interface SessionRecoveryBannerProps {
  sessionId: string;
  currentStep: number;
  savedTimestamp?: string;
  onDismiss: () => void;
}

export function SessionRecoveryBanner({
  sessionId,
  currentStep,
  savedTimestamp,
  onDismiss
}: SessionRecoveryBannerProps) {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendRecoveryLink = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-recovery-email', {
        body: { email, sessionId, step: currentStep }
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: 'Recovery link sent!',
        description: 'Check your email to continue on another device'
      });
    } catch (error) {
      console.error('Failed to send recovery email:', error);
      toast({
        title: 'Failed to send',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  if (sent) {
    return (
      <Card className="p-4 bg-primary/5 border-primary/20 mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Recovery link sent to {email}</p>
            <p className="text-xs text-muted-foreground">
              Check your email to continue from step {currentStep + 1}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-muted/50 border-border/50 mb-6">
      <div className="flex items-start gap-3">
        <RefreshCw className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Continue on another device?</p>
              {savedTimestamp && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Progress saved {formatRelativeTime(savedTimestamp)}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              Step {currentStep + 1}/5
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-9 text-sm"
            />
            <Button 
              size="sm" 
              onClick={handleSendRecoveryLink}
              disabled={isSending || !email}
              className="h-9"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-1" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

// Inline recovery prompt for mobile
export function MobileRecoveryPrompt({
  sessionId,
  currentStep,
  onSendLink
}: {
  sessionId: string;
  currentStep: number;
  onSendLink: (email: string) => Promise<void>;
}) {
  const [showInput, setShowInput] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!email) return;
    setIsSending(true);
    try {
      await onSendLink(email);
    } finally {
      setIsSending(false);
    }
  };

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
      >
        <Smartphone className="h-3 w-3" />
        Continue on phone
      </button>
    );
  }

  return (
    <div className="flex gap-2 mt-3">
      <Input
        type="email"
        placeholder="Email for recovery link"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 h-8 text-sm"
        autoFocus
      />
      <Button size="sm" onClick={handleSend} disabled={isSending} className="h-8">
        {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
      </Button>
    </div>
  );
}
