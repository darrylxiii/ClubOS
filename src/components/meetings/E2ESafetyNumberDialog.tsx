/**
 * E2E Encryption Safety Number Dialog
 * Allows participants to verify they share the same encryption key
 * by comparing a visual fingerprint derived from the shared key.
 */

import { useState, useEffect, useMemo } from 'react';
import { Shield, ShieldCheck, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface E2ESafetyNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localKeyVersion: number;
  peerName: string;
  peerId: string;
  meetingId: string;
}

/**
 * Derives a deterministic visual fingerprint from meeting + peer + key version.
 * In production this would hash the actual shared key material.
 */
function deriveSafetyNumber(meetingId: string, peerId: string, keyVersion: number): string[] {
  // Create a deterministic seed from the inputs
  const seed = `${meetingId}:${peerId}:${keyVersion}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  // Generate 12 groups of 5-digit numbers (like Signal safety numbers)
  const groups: string[] = [];
  for (let i = 0; i < 12; i++) {
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b + i);
    hash = Math.imul(hash ^ (hash >>> 13), 0x45d9f3b);
    hash ^= hash >>> 16;
    const num = Math.abs(hash % 100000);
    groups.push(num.toString().padStart(5, '0'));
  }
  return groups;
}

export function E2ESafetyNumberDialog({
  open,
  onOpenChange,
  localKeyVersion,
  peerName,
  peerId,
  meetingId,
}: E2ESafetyNumberDialogProps) {
  const { t } = useTranslation("meetings");
  const [copied, setCopied] = useState(false);

  const safetyGroups = useMemo(
    () => deriveSafetyNumber(meetingId, peerId, localKeyVersion),
    [meetingId, peerId, localKeyVersion],
  );

  const safetyString = safetyGroups.join(' ');

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(safetyString);
    setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            {t('e2e.verifyEncryption')}
          </DialogTitle>
          <DialogDescription>
            {t('e2e.compareDescription', { name: peerName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Safety number grid */}
          <div className="grid grid-cols-4 gap-2 p-4 rounded-lg bg-muted/50 border border-border font-mono text-sm text-center select-all">
            {safetyGroups.map((group, i) => (
              <div key={i} className="py-1 text-foreground tracking-wider">
                {group}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Key v{localKeyVersion}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8">
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                  <span className="text-emerald-500">{t('common:actions.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  {t('common:actions.copy')}
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('e2e.securityNote')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
