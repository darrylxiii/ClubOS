import { useTranslation } from 'react-i18next';
import { useRole } from '@/contexts/RoleContext';
import { motion } from '@/lib/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Building2 } from 'lucide-react';
import { BrandScoreOverview } from '@/components/partner/brand/BrandScoreOverview';
import { CandidateNPSTracking } from '@/components/partner/brand/CandidateNPSTracking';
import { CompetitorBrandComparison } from '@/components/partner/brand/CompetitorBrandComparison';

export default function BrandCommandCenter() {
  const { t } = useTranslation('partner');
  const { companyId, isLoading: roleLoading } = useRole();

  if (roleLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <EmptyState
        icon={Building2}
        title={t('brandCenter.noCompany', 'No Company Selected')}
        description={t(
          'brandCenter.noCompanyDescription',
          'Connect to a company to view your employer brand command center and track how candidates perceive your organization.'
        )}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Top: Full-width brand score overview */}
      <BrandScoreOverview companyId={companyId} />

      {/* Middle row: NPS + Competitor comparison side by side */}
      <div className="grid gap-6 md:grid-cols-2">
        <CandidateNPSTracking companyId={companyId} />
        <CompetitorBrandComparison companyId={companyId} />
      </div>
    </motion.div>
  );
}
