import { useEffect, useState } from 'react';
import { validateTURNConfig, getTURNHealth, TURNServerHealth } from '@/utils/webrtcConfig';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Server, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface TURNServerStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function TURNServerStatus({ className, showDetails = false }: TURNServerStatusProps) {
  const { t } = useTranslation("meetings");
  const [health, setHealth] = useState<TURNServerHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      setLoading(true);
      try {
        const result = await validateTURNConfig();
        setHealth(result);
      } catch (err) {
        console.error('[TURN Status] Validation failed:', err);
      }
      setLoading(false);
    };

    // Check cached first
    const cached = getTURNHealth();
    if (cached) {
      setHealth(cached);
      setLoading(false);
    } else {
      checkHealth();
    }
  }, []);

  if (loading) {
    return (
      <Badge variant="outline" className={cn('animate-pulse', className)}>
        <Server className="w-3 h-3 mr-1" />
        {t('turn.checking')}
      </Badge>
    );
  }

  if (!health) {
    return null;
  }

  const hasErrors = health.validationErrors.length > 0 && health.isPaidServer;
  const isOptimal = health.isPaidServer && !hasErrors;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isOptimal ? 'default' : hasErrors ? 'destructive' : 'secondary'}
            className={cn('cursor-help', className)}
          >
            {isOptimal ? (
              <Shield className="w-3 h-3 mr-1" />
            ) : hasErrors ? (
              <AlertTriangle className="w-3 h-3 mr-1" />
            ) : (
              <Server className="w-3 h-3 mr-1" />
            )}
            {isOptimal ? t('turn.production') : health.isPaidServer ? t('turn.error') : t('turn.community')}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isOptimal ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              )}
              <span className="font-medium">
                {health.isPaidServer ? t('turn.productionServers') : t('turn.communityServers')}
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground">
              {health.isPaidServer
                ? t('turn.dedicatedDescription', { count: health.servers })
                : t('turn.communityDescription')}
            </p>

            {health.validationErrors.length > 0 && (
              <div className="text-xs text-destructive">
                {health.validationErrors.map((err, i) => (
                  <p key={i}>⚠️ {err}</p>
                ))}
              </div>
            )}

            {showDetails && (
              <div className="text-xs text-muted-foreground pt-1 border-t">
                <p>{t('turn.servers')}: {health.servers}</p>
                {health.lastValidated && (
                  <p>{t('turn.validated')}: {health.lastValidated.toLocaleTimeString()}</p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
