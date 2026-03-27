import React from 'react';
import { useTranslation } from 'react-i18next';
import { QuantumPerformanceMatrix } from '@/components/admin/QuantumPerformanceMatrix';

const QuantumPerformanceMatrixPage = () => {
  const { t } = useTranslation('admin');
  return (
    <div className="space-y-6">
      <QuantumPerformanceMatrix />
    </div>
  );
};

export default QuantumPerformanceMatrixPage;
