import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Lock, Shield, Unlock } from 'lucide-react';
import { motion } from '@/lib/motion';
import { ConfirmActionDialog } from '@/components/ui/ConfirmActionDialog';
import type { DisclosureLevel } from '@/hooks/useConfidentialMode';
import type { LucideIcon } from 'lucide-react';

interface TierConfig {
  level: DisclosureLevel;
  label: string;
  description: string;
  icon: LucideIcon;
  activeColor: string;
  activeBg: string;
  activeBorder: string;
}

interface TieredDisclosureControlProps {
  currentLevel: DisclosureLevel;
  onChangeLevel: (level: DisclosureLevel) => void;
  isUpdating?: boolean;
  className?: string;
}

const TIER_ORDER: DisclosureLevel[] = ['code_name_only', 'nda_required', 'full_access'];

export function TieredDisclosureControl({
  currentLevel,
  onChangeLevel,
  isUpdating = false,
  className,
}: TieredDisclosureControlProps) {
  const { t } = useTranslation('partner');
  const [pendingLevel, setPendingLevel] = useState<DisclosureLevel | null>(null);

  const tiers: TierConfig[] = [
    {
      level: 'code_name_only',
      label: t('confidential.tier.codeNameOnly', 'Code Name Only'),
      description: t('confidential.tier.codeNameDesc', 'Most restricted. Candidates see only the code name.'),
      icon: Lock,
      activeColor: 'text-amber-500',
      activeBg: 'bg-amber-500/10',
      activeBorder: 'border-amber-500/40',
    },
    {
      level: 'nda_required',
      label: t('confidential.tier.ndaRequired', 'NDA Required'),
      description: t('confidential.tier.ndaDesc', 'Company revealed after NDA is signed.'),
      icon: Shield,
      activeColor: 'text-blue-500',
      activeBg: 'bg-blue-500/10',
      activeBorder: 'border-blue-500/40',
    },
    {
      level: 'full_access',
      label: t('confidential.tier.fullAccess', 'Full Access'),
      description: t('confidential.tier.fullAccessDesc', 'All details visible to approved candidates.'),
      icon: Unlock,
      activeColor: 'text-emerald-500',
      activeBg: 'bg-emerald-500/10',
      activeBorder: 'border-emerald-500/40',
    },
  ];

  const currentIndex = TIER_ORDER.indexOf(currentLevel);

  const handleTierClick = (level: DisclosureLevel) => {
    if (level === currentLevel || isUpdating) return;
    setPendingLevel(level);
  };

  const handleConfirm = () => {
    if (pendingLevel) {
      onChangeLevel(pendingLevel);
      setPendingLevel(null);
    }
  };

  const pendingTier = pendingLevel ? tiers.find((t) => t.level === pendingLevel) : null;

  return (
    <>
      <div className={cn('space-y-3', className)}>
        <p className="text-xs font-medium text-muted-foreground">
          {t('confidential.disclosure.label', 'Disclosure Level')}
        </p>

        <div className="flex gap-2">
          {tiers.map((tier, index) => {
            const isActive = tier.level === currentLevel;
            const isPast = index < currentIndex;
            const Icon = tier.icon;

            return (
              <motion.button
                key={tier.level}
                type="button"
                onClick={() => handleTierClick(tier.level)}
                disabled={isUpdating}
                whileHover={!isActive && !isUpdating ? { scale: 1.02 } : undefined}
                whileTap={!isActive && !isUpdating ? { scale: 0.98 } : undefined}
                className={cn(
                  'flex-1 relative rounded-lg border p-3 text-left transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? cn(tier.activeBg, tier.activeBorder, 'ring-1', tier.activeBorder)
                    : 'border-border/40 hover:border-border/80',
                  !isActive && !isUpdating && 'cursor-pointer opacity-60 hover:opacity-80',
                  isUpdating && !isActive && 'cursor-not-allowed opacity-40'
                )}
              >
                {/* Connector line between tiers */}
                {index < tiers.length - 1 && (
                  <div
                    className={cn(
                      'absolute top-1/2 -right-[9px] w-[18px] h-px',
                      isPast || isActive ? 'bg-primary/40' : 'bg-border/30'
                    )}
                  />
                )}

                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-full shrink-0',
                      isActive ? cn(tier.activeBg, tier.activeColor) : 'bg-muted/50 text-muted-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      isActive ? tier.activeColor : 'text-muted-foreground'
                    )}
                  >
                    {t('confidential.tier.number', 'Tier {{n}}', { n: index + 1 })}
                  </span>
                </div>

                <p className={cn('text-xs font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {tier.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                  {tier.description}
                </p>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="active-tier-dot"
                    className={cn('absolute top-2 right-2 w-2 h-2 rounded-full', tier.activeColor.replace('text-', 'bg-'))}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmActionDialog
        open={!!pendingLevel}
        onOpenChange={(open) => {
          if (!open) setPendingLevel(null);
        }}
        type="confirm"
        title={t('confidential.disclosure.confirmTitle', 'Change Disclosure Level')}
        description={
          pendingTier
            ? t('confidential.disclosure.confirmDesc', 'Change the disclosure level to "{{level}}"? This will affect what information candidates can see.', {
                level: pendingTier.label,
              })
            : ''
        }
        confirmText={t('confidential.disclosure.confirmAction', 'Change Level')}
        onConfirm={handleConfirm}
        isLoading={isUpdating}
      />
    </>
  );
}
