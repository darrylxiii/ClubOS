import { RevenueOverviewChart } from './RevenueOverviewChart';

interface FinancialOverviewChartProps {
  year?: number;
  legalEntity?: string;
}

export function FinancialOverviewChart({ year, legalEntity }: FinancialOverviewChartProps) {
  return <RevenueOverviewChart year={year} legalEntity={legalEntity} />;
}