import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { UnifiedKPICommandCenter } from '@/components/admin/kpi/UnifiedKPICommandCenter';

const UnifiedKPICommandCenterPage = () => {
  return (
    <AppLayout>
      <UnifiedKPICommandCenter />
    </AppLayout>
  );
};

export default UnifiedKPICommandCenterPage;
