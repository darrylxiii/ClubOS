import React from 'react';
import { useTranslation } from 'react-i18next';
import { WebsiteKPIDashboard } from '@/components/admin/WebsiteKPIDashboard';

const WebsiteKPIDashboardPage = () => {
  const { t } = useTranslation('admin');
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <WebsiteKPIDashboard />
    </div>
  );
};

export default WebsiteKPIDashboardPage;