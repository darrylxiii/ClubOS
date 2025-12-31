/**
 * E2E Encryption Toggle Component
 * Shows encryption status and allows toggling E2EE for meetings
 */

import { Shield, ShieldCheck, ShieldOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supportsE2EEncryption } from '@/utils/webrtcConfig';

interface E2EEncryptionToggleProps {
  isEnabled: boolean;
  isSupported: boolean;
  keyVersion: number;
  peersEncrypted: number;
  totalPeers: number;
  error?: string | null;
  onToggle: () => void;
  disabled?: boolean;
}

export function E2EEncryptionToggle({
  isEnabled,
  isSupported,
  keyVersion,
  peersEncrypted,
  totalPeers,
  error,
  onToggle,
  disabled = false
}: E2EEncryptionToggleProps) {
  const browserSupported = supportsE2EEncryption();
  
  // Determine status
  const getStatus = () => {
    if (!browserSupported) {
      return {
        icon: ShieldOff,
        label: 'Not Supported',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        tooltip: 'Your browser does not support E2E encryption (requires Insertable Streams API). Try Chrome 86+ or Edge 86+.'
      };
    }
    
    if (error) {
      return {
        icon: AlertTriangle,
        label: 'Error',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        tooltip: `Encryption error: ${error}`
      };
    }
    
    if (isEnabled) {
      const allEncrypted = peersEncrypted === totalPeers;
      return {
        icon: ShieldCheck,
        label: allEncrypted ? 'Encrypted' : 'Encrypting...',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        tooltip: allEncrypted 
          ? `All ${totalPeers} peer(s) encrypted with key v${keyVersion}`
          : `Encrypting ${peersEncrypted}/${totalPeers} peers...`
      };
    }
    
    return {
      icon: Shield,
      label: 'Disabled',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      tooltip: 'End-to-end encryption is disabled. Click to enable for HIPAA/SOC2 compliance.'
    };
  };
  
  const status = getStatus();
  const StatusIcon = status.icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            disabled={disabled || !browserSupported}
            className={`flex items-center gap-2 ${status.bgColor} hover:opacity-80 transition-opacity`}
          >
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
            <span className={`text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
            {isEnabled && keyVersion > 0 && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                v{keyVersion}
              </Badge>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{status.tooltip}</p>
          {isEnabled && totalPeers > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {peersEncrypted}/{totalPeers} connections encrypted
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
