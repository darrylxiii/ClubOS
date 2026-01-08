import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, HelpCircle, Shield } from 'lucide-react';
import { useWhatsAppBroadcastConsent } from '@/hooks/useWhatsAppBroadcastConsent';

interface WhatsAppConsentBadgeProps {
  phoneNumber: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export function WhatsAppConsentBadge({
  phoneNumber,
  showLabel = false,
  size = 'sm',
  onClick,
}: WhatsAppConsentBadgeProps) {
  const { consent, loading } = useWhatsAppBroadcastConsent(phoneNumber);

  if (loading) {
    return (
      <Badge variant="outline" className="animate-pulse h-5 w-5 p-0" />
    );
  }

  const status = consent?.consent_status || 'unknown';

  const config = {
    opted_in: {
      icon: Check,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      label: 'Opted In',
      tooltip: 'Can receive broadcast messages',
    },
    opted_out: {
      icon: X,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      label: 'Opted Out',
      tooltip: 'Has unsubscribed from broadcasts',
    },
    unknown: {
      icon: HelpCircle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      label: 'Unknown',
      tooltip: 'Consent status not confirmed',
    },
  };

  const { icon: Icon, color, bg, border, label, tooltip } = config[status];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 cursor-default transition-colors',
        bg,
        border,
        color,
        size === 'sm' ? 'h-5 text-xs px-1.5' : 'h-6 text-xs px-2',
        onClick && 'cursor-pointer hover:opacity-80'
      )}
      onClick={onClick}
    >
      <Icon className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      {showLabel && <span>{label}</span>}
    </Badge>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5" />
        <span>{tooltip}</span>
        {consent?.consent_source && (
          <span className="text-muted-foreground">• {consent.consent_source}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
