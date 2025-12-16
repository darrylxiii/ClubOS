import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { differenceInHours, differenceInMinutes, format } from 'date-fns';

interface MessagingWindowIndicatorProps {
  expiresAt: string | null;
  compact?: boolean;
}

export function MessagingWindowIndicator({ expiresAt, compact = false }: MessagingWindowIndicatorProps) {
  if (!expiresAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              {compact ? <Clock className="h-3 w-3" /> : 'Window Closed'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>24h messaging window is closed. Only template messages can be sent.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const now = new Date();
  const expiry = new Date(expiresAt);
  const hoursRemaining = differenceInHours(expiry, now);
  const minutesRemaining = differenceInMinutes(expiry, now);
  const isExpired = expiry < now;
  const isExpiringSoon = hoursRemaining < 4 && !isExpired;

  if (isExpired) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              {compact ? <Clock className="h-3 w-3" /> : 'Window Closed'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>24h messaging window expired. Only template messages can be sent.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isExpiringSoon) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              {compact ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {hoursRemaining > 0 ? `${hoursRemaining}h left` : `${minutesRemaining}m left`}
                </span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Messaging window expires soon at {format(expiry, 'HH:mm')}</p>
            <p className="text-xs text-muted-foreground">Send a message to keep the conversation going</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            {compact ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {hoursRemaining}h window
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Messaging window active until {format(expiry, 'MMM d, HH:mm')}</p>
          <p className="text-xs text-muted-foreground">You can send free-form messages</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
