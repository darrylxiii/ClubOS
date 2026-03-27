import React from 'react';
import { useTranslation } from 'react-i18next';

import { UnifiedKPICommandCenter } from '@/components/admin/kpi/UnifiedKPICommandCenter';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const UnifiedKPICommandCenterPage = () => {
  const { t } = useTranslation('admin');
  return (
    <ErrorBoundary>
      <UnifiedKPICommandCenter />
    </ErrorBoundary>
  );
};

export default UnifiedKPICommandCenterPage;
