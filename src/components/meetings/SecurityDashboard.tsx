/**
 * Meeting Security Dashboard
 * Comprehensive view of encryption status across all participants
 */

import { useState } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldOff, 
  AlertTriangle, 
  Lock, 
  Unlock,
  RefreshCw,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SecurityVerification } from './SecurityVerification';
import { cn } from '@/lib/utils';

interface ParticipantSecurity {
  id: string;
  name: string;
  isEncrypted: boolean;
  isVerified: boolean;
  keyVersion: number;
  securityCode?: string;
  emojis?: string[];
}

interface SecurityDashboardProps {
  enabled: boolean;
  keyVersion: number;
  participants: ParticipantSecurity[];
  onRotateKey: () => Promise<void>;
  onVerifyParticipant: (participantId: string, verified: boolean) => void;
  onToggleEncryption: () => void;
  className?: string;
}

export function SecurityDashboard({
  enabled,
  keyVersion,
  participants,
  onRotateKey,
  onVerifyParticipant,
  onToggleEncryption,
  className
}: SecurityDashboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  const encryptedCount = participants.filter(p => p.isEncrypted).length;
  const verifiedCount = participants.filter(p => p.isVerified).length;
  const totalCount = participants.length;
  
  const encryptionPercentage = totalCount > 0 ? (encryptedCount / totalCount) * 100 : 0;
  const verificationPercentage = totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0;

  const getOverallStatus = () => {
    if (!enabled) return { icon: ShieldOff, label: 'Disabled', color: 'text-muted-foreground' };
    if (encryptedCount === totalCount && verifiedCount === totalCount) {
      return { icon: ShieldCheck, label: 'Fully Secured', color: 'text-emerald-500' };
    }
    if (encryptedCount === totalCount) {
      return { icon: Shield, label: 'Encrypted', color: 'text-blue-500' };
    }
    return { icon: AlertTriangle, label: 'Partial', color: 'text-amber-500' };
  };

  const status = getOverallStatus();
  const StatusIcon = status.icon;

  const handleRotateKey = async () => {
    setIsRotating(true);
    try {
      await onRotateKey();
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn("border-border/50", className)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  enabled ? "bg-emerald-500/10" : "bg-muted"
                )}>
                  <StatusIcon className={cn("h-5 w-5", status.color)} />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">
                    End-to-End Encryption
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {enabled 
                      ? `${encryptedCount}/${totalCount} encrypted • v${keyVersion}`
                      : 'Click to enable security features'
                    }
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={enabled ? "default" : "secondary"} className="text-xs">
                  {status.label}
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Status bars */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Encrypted
                  </span>
                  <span>{encryptedCount}/{totalCount}</span>
                </div>
                <Progress value={encryptionPercentage} className="h-1.5" />
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                  <span>{verifiedCount}/{totalCount}</span>
                </div>
                <Progress value={verificationPercentage} className="h-1.5 [&>div]:bg-emerald-500" />
              </div>
            </div>

            {/* Participant list */}
            {participants.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>Participants</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {participants.map(participant => (
                    <div 
                      key={participant.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        {participant.isEncrypted ? (
                          <Lock className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Unlock className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-sm">{participant.name}</span>
                      </div>
                      
                      {participant.isEncrypted && (
                        <SecurityVerification
                          securityCode={participant.securityCode}
                          emojis={participant.emojis}
                          isVerified={participant.isVerified}
                          peerName={participant.name}
                          peerId={participant.id}
                          onVerify={(verified) => onVerifyParticipant(participant.id, verified)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant={enabled ? "outline" : "default"}
                size="sm"
                onClick={onToggleEncryption}
                className="flex-1"
              >
                {enabled ? (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Disable E2EE
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Enable E2EE
                  </>
                )}
              </Button>
              
              {enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotateKey}
                  disabled={isRotating}
                >
                  <RefreshCw className={cn("h-4 w-4", isRotating && "animate-spin")} />
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
