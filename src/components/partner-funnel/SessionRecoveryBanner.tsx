/**
 * SessionRecoveryBanner — simplified.
 * Legacy "send-recovery-email" removed. The DB-backed ?resume= flow handles cross-device recovery.
 * This component now shows a simple "welcome back" banner with resume info.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Clock, RefreshCw } from 'lucide-react';
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
  onDismiss,
}: SessionRecoveryBannerProps) {
  return (
    <Card className="p-4 bg-muted/50 border-border/50 mb-6">
      <div className="flex items-start gap-3">
        <RefreshCw className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Welcome back</p>
              {savedTimestamp && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Progress saved {formatRelativeTime(savedTimestamp)}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              Step {currentStep + 1}/3
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
