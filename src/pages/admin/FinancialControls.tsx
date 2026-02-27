import { useState } from 'react';
import { FinancialPeriodManager } from '@/components/financial/FinancialPeriodManager';
import { BudgetVsActual } from '@/components/financial/BudgetVsActual';
import { YearSelector } from '@/components/financial/YearSelector';
import { EntitySelector, LegalEntityFilter } from '@/components/financial/EntitySelector';
import { useFinancialYearSelector } from '@/hooks/useFinancialYearSelector';

export default function FinancialControls() {
  const { selectedYear, setSelectedYear, yearOptions, availableYears } = useFinancialYearSelector();
  const [legalEntity, setLegalEntity] = useState<LegalEntityFilter>('all');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Financial Controls</h2>
          <p className="text-sm text-muted-foreground">Period management, budgets, and compliance safeguards</p>
        </div>
        <div className="flex items-center gap-2">
          <EntitySelector value={legalEntity} onChange={setLegalEntity} />
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            yearOptions={yearOptions}
            availableYears={availableYears}
          />
        </div>
      </div>

      <FinancialPeriodManager year={selectedYear} />
      <BudgetVsActual legalEntity={legalEntity} />
    </div>
  );
}
