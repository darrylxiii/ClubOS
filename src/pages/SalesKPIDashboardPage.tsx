import React from 'react';
import { useTranslation } from 'react-i18next';
import { SalesKPIDashboard } from '@/components/admin/SalesKPIDashboard';

const SalesKPIDashboardPage = () => {
  const { t } = useTranslation('admin');
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <SalesKPIDashboard />
    </div>
  );
};

export default SalesKPIDashboardPage;