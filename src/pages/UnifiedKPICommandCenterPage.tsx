import React from 'react';

import { UnifiedKPICommandCenter } from '@/components/admin/kpi/UnifiedKPICommandCenter';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const UnifiedKPICommandCenterPage = () => {
  return (
    <ErrorBoundary>
      <UnifiedKPICommandCenter />
    </ErrorBoundary>
  );
};

export default UnifiedKPICommandCenterPage;
