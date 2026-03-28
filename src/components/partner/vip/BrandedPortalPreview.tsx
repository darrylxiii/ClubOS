import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Eye, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BrandedPortalPreviewProps {
  companyName?: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  description: string;
  className?: string;
}

export function BrandedPortalPreview({
  companyName,
  logoUrl,
  primaryColor,
  secondaryColor,
  description,
  className,
}: BrandedPortalPreviewProps) {
  const { t } = useTranslation('partner');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'glass-card rounded-xl border border-border/20 overflow-hidden',
        className,
      )}
    >
      {/* Header label */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Eye className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">
            {t('vip.brandedPortal.title', 'Branded Portal Preview')}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
          {t('vip.brandedPortal.candidateView', 'Candidate View')}
        </Badge>
      </div>

      <p className="px-5 pb-3 text-xs text-muted-foreground">
        {t('vip.brandedPortal.subtitle', 'This is how candidates experience your brand when they visit your portal.')}
      </p>

      {/* Inner preview frame */}
      <div className="mx-5 mb-5 rounded-lg border border-border/30 bg-background/50 overflow-hidden shadow-sm">
        {/* Simulated branded header bar */}
        <div
          className="h-14 flex items-center gap-3 px-4"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName || 'Company logo'}
              className="h-8 w-8 rounded-md object-cover bg-white/20"
            />
          ) : (
            <div className="h-8 w-8 rounded-md bg-white/20 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="text-white font-semibold text-sm truncate">
            {companyName || t('vip.brandedPortal.companyPlaceholder', 'Your Company')}
          </span>
        </div>

        {/* Preview body */}
        <div className="p-4 space-y-3">
          {description ? (
            <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
          ) : (
            <div className="space-y-2">
              <div className="h-3 rounded bg-muted/50 w-3/4" />
              <div className="h-3 rounded bg-muted/50 w-1/2" />
            </div>
          )}

          {/* Simulated navigation links */}
          <div className="flex gap-2 pt-2">
            {['Open Positions', 'Culture', 'Benefits'].map((label) => (
              <div
                key={label}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-muted/40 text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
