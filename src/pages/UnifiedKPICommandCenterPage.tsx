import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { UnifiedKPICommandCenter } from '@/components/admin/kpi/UnifiedKPICommandCenter';
import { ErrorBoundary } from '@/components/ui/error-boundary';

const UnifiedKPICommandCenterPage = () => {
  return (
    <AppLayout>
      <ErrorBoundary>
        <UnifiedKPICommandCenter />
      </ErrorBoundary>
    </AppLayout>
  );
};

export default UnifiedKPICommandCenterPage;
