import { RevenueOverviewChart } from './RevenueOverviewChart';

interface FinancialOverviewChartProps {
  year?: number;
}

export function FinancialOverviewChart({ year }: FinancialOverviewChartProps) {
  return <RevenueOverviewChart year={year} />;
}