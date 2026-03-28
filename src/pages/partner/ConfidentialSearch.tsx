import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRole } from '@/contexts/RoleContext';
import { RoleGate } from '@/components/RoleGate';
import { useConfidentialMode } from '@/hooks/useConfidentialMode';
import type { DisclosureLevel, ConfidentialJob } from '@/hooks/useConfidentialMode';
import { CodeNamedRoleEditor } from '@/components/partner/confidential/CodeNamedRoleEditor';
import { TieredDisclosureControl } from '@/components/partner/confidential/TieredDisclosureControl';
import { ConfidentialAuditTrail } from '@/components/partner/confidential/ConfidentialAuditTrail';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Lock, Plus, Users, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from '@/lib/motion';
import { cn } from '@/lib/utils';

const DISCLOSURE_BADGE_CONFIG: Record<DisclosureLevel, { label: string; className: string }> = {
  code_name_only: {
    label: 'Tier 1',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  },
  nda_required: {
    label: 'Tier 2',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  },
  full_access: {
    label: 'Tier 3',
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  },
};

function ConfidentialJobRow({
  job,
  isExpanded,
  onToggle,
  onDisclosureChange,
  isUpdating,
  t,
}: {
  job: ConfidentialJob;
  isExpanded: boolean;
  onToggle: () => void;
  onDisclosureChange: (level: DisclosureLevel) => void;
  isUpdating: boolean;
  t: (key: string, fallback?: string, opts?: Record<string, unknown>) => string;
}) {
  const [titleRevealed, setTitleRevealed] = useState(false);
  const badgeConfig = DISCLOSURE_BADGE_CONFIG[job.disclosure_level];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass-card hover:border-primary/20 transition-all duration-200">
        {/* Summary row */}
        <CardContent
          className="flex items-center gap-4 p-4 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-500/10 shrink-0">
            <Lock className="h-4 w-4 text-amber-500" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{job.code_name}</p>
            <p
              className={cn(
                'text-xs mt-0.5 truncate transition-all duration-200',
                titleRevealed ? 'text-muted-foreground' : 'text-transparent select-none'
              )}
              style={
                titleRevealed
                  ? undefined
                  : { textShadow: '0 0 8px rgba(255,255,255,0.5)', filter: 'blur(4px)' }
              }
              onMouseEnter={() => setTitleRevealed(true)}
              onMouseLeave={() => setTitleRevealed(false)}
              title={'Hover to reveal actual title'}
            >
              {job.title}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="outline" className={cn('text-[10px]', badgeConfig.className)}>
              {badgeConfig.label}
            </Badge>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {job.candidate_count}
            </div>

            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardContent>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-6 border-t border-border/30 pt-4">
                {/* Disclosure control */}
                <TieredDisclosureControl
                  currentLevel={job.disclosure_level}
                  onChangeLevel={onDisclosureChange}
                  isUpdating={isUpdating}
                />

                {/* Audit trail */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">
                    {'Audit Trail'}
                  </p>
                  <ConfidentialAuditTrail jobId={job.id} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

export default function ConfidentialSearch() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();
  const {
    confidentialJobs,
    createSearch,
    updateDisclosure,
    isLoading,
    isError,
  } = useConfidentialMode();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const handleToggle = (jobId: string) => {
    setExpandedJobId((prev) => (prev === jobId ? null : jobId));
  };

  const handleCreate = (data: {
    codeName: string;
    actualTitle: string;
    disclosureLevel: DisclosureLevel;
    tierDescriptions?: Record<string, string | undefined>;
  }) => {
    createSearch.mutate(
      {
        codeName: data.codeName,
        actualTitle: data.actualTitle,
        disclosureLevel: data.disclosureLevel,
        tierDescriptions: data.tierDescriptions,
      },
      {
        onSuccess: () => setDialogOpen(false),
      }
    );
  };

  const handleDisclosureChange = (jobId: string, level: DisclosureLevel) => {
    updateDisclosure.mutate({ jobId, level });
  };

  // Loading state
  if (isLoading) {
    return (
      <RoleGate allowedRoles={['partner', 'admin', 'strategist']}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-9 w-48" />
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </RoleGate>
    );
  }

  return (
    <RoleGate allowedRoles={['partner', 'admin', 'strategist']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10">
              <Lock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {t('confidential.title', 'Confidential Searches')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('confidential.subtitle', 'Manage C-suite and sensitive executive searches with tiered disclosure.')}
              </p>
            </div>
          </div>

          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('confidential.newSearch', 'New Confidential Search')}
          </Button>
        </div>

        {/* Error state */}
        {isError && (
          <EmptyState
            icon={ShieldAlert}
            title={t('confidential.errorTitle', 'Unable to load confidential searches')}
            description={t('confidential.errorDesc', 'There was an issue loading your searches. Please try again later.')}
            iconColor="text-destructive"
          />
        )}

        {/* Empty state */}
        {!isError && confidentialJobs.length === 0 && (
          <EmptyState
            icon={Lock}
            title={t('confidential.empty', 'No confidential searches yet')}
            description={t('confidential.emptyDesc', 'Create your first confidential search to manage sensitive executive placements with tiered candidate disclosure.')}
            iconColor="text-amber-500"
            bgGradient="from-amber-500/10 to-amber-600/5"
            primaryAction={{
              label: t('confidential.newSearch', 'New Confidential Search'),
              onClick: () => setDialogOpen(true),
              icon: Plus,
            }}
          />
        )}

        {/* Job list */}
        {!isError && confidentialJobs.length > 0 && (
          <div className="space-y-3">
            {confidentialJobs.map((job) => (
              <ConfidentialJobRow
                key={job.id}
                job={job}
                isExpanded={expandedJobId === job.id}
                onToggle={() => handleToggle(job.id)}
                onDisclosureChange={(level) => handleDisclosureChange(job.id, level)}
                isUpdating={updateDisclosure.isPending}
                t={t}
              />
            ))}
          </div>
        )}

        {/* Create dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>
                {t('confidential.newSearch', 'New Confidential Search')}
              </DialogTitle>
              <DialogDescription>
                {t('confidential.newSearchDesc', 'Create a new confidential search with code name and tiered disclosure.')}
              </DialogDescription>
            </DialogHeader>
            <CodeNamedRoleEditor
              onSubmit={handleCreate}
              isSubmitting={createSearch.isPending}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </RoleGate>
  );
}
