import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryStats {
  totalAssets: number;
  activeAssets: number;
  fullyDepreciated: number;
  totalPurchaseValue: number;
  totalBookValue: number;
  totalAccumulatedDepreciation: number;
  monthlyDepreciation: number;
  annualDepreciation: number;
  kiaEligibleTotal: number;
  kiaEligibleCount: number;
  assetsByCategory: Record<string, number>;
  assetsByStatus: Record<string, number>;
  valueByCategory: Record<string, { purchase: number; book: number }>;
  recentAssets: Array<{
    id: string;
    asset_name: string;
    inventory_number: string;
    category: string;
    purchase_date: string;
    total_purchase_value: number | null;
  }>;
}

export interface MonthlyDepreciationTrend {
  month: string;
  year: number;
  monthNum: number;
  totalDepreciation: number;
  postedDepreciation: number;
}

export function useInventoryStats(fiscalYear?: number) {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyDepreciationTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch all assets
        const { data: assets, error: assetsError } = await supabase
          .from('inventory_assets')
          .select('*');
        
        if (assetsError) throw assetsError;

        const assetList = assets || [];

        // Calculate stats
        const totalAssets = assetList.length;
        const activeAssets = assetList.filter(a => a.status === 'active').length;
        const fullyDepreciated = assetList.filter(a => a.status === 'fully_depreciated').length;
        const totalPurchaseValue = assetList.reduce((sum, a) => sum + (a.total_purchase_value || 0), 0);
        const totalBookValue = assetList.reduce((sum, a) => sum + (a.current_book_value || 0), 0);
        const totalAccumulatedDepreciation = assetList.reduce((sum, a) => sum + (a.accumulated_depreciation || 0), 0);
        const monthlyDepreciation = assetList
          .filter(a => a.status === 'active')
          .reduce((sum, a) => sum + (a.monthly_depreciation || 0), 0);
        const annualDepreciation = assetList
          .filter(a => a.status === 'active')
          .reduce((sum, a) => sum + (a.annual_depreciation || 0), 0);

        // KIA stats
        const kiaAssets = assetList.filter(a => a.kia_eligible);
        const kiaEligibleTotal = kiaAssets.reduce((sum, a) => sum + (a.total_purchase_value || 0), 0);
        const kiaEligibleCount = kiaAssets.length;

        // Group by category
        const assetsByCategory: Record<string, number> = {};
        const valueByCategory: Record<string, { purchase: number; book: number }> = {};
        
        assetList.forEach(asset => {
          const cat = asset.category;
          assetsByCategory[cat] = (assetsByCategory[cat] || 0) + 1;
          
          if (!valueByCategory[cat]) {
            valueByCategory[cat] = { purchase: 0, book: 0 };
          }
          valueByCategory[cat].purchase += asset.total_purchase_value || 0;
          valueByCategory[cat].book += asset.current_book_value || 0;
        });

        // Group by status
        const assetsByStatus: Record<string, number> = {};
        assetList.forEach(asset => {
          const status = asset.status || 'unknown';
          assetsByStatus[status] = (assetsByStatus[status] || 0) + 1;
        });

        // Recent assets
        const recentAssets = assetList
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 5)
          .map(a => ({
            id: a.id,
            asset_name: a.asset_name,
            inventory_number: a.inventory_number,
            category: a.category,
            purchase_date: a.purchase_date,
            total_purchase_value: a.total_purchase_value,
          }));

        setStats({
          totalAssets,
          activeAssets,
          fullyDepreciated,
          totalPurchaseValue,
          totalBookValue,
          totalAccumulatedDepreciation,
          monthlyDepreciation,
          annualDepreciation,
          kiaEligibleTotal,
          kiaEligibleCount,
          assetsByCategory,
          assetsByStatus,
          valueByCategory,
          recentAssets,
        });

        // Fetch monthly depreciation trend
        const currentYear = fiscalYear || new Date().getFullYear();
        const { data: ledgerData } = await supabase
          .from('inventory_depreciation_ledger')
          .select('period_year, period_month, depreciation_amount, is_posted')
          .eq('period_year', currentYear);

        const monthlyMap = new Map<string, { total: number; posted: number }>();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        (ledgerData || []).forEach(entry => {
          const key = `${entry.period_year}-${entry.period_month}`;
          const current = monthlyMap.get(key) || { total: 0, posted: 0 };
          current.total += entry.depreciation_amount || 0;
          if (entry.is_posted) {
            current.posted += entry.depreciation_amount || 0;
          }
          monthlyMap.set(key, current);
        });

        const trend: MonthlyDepreciationTrend[] = [];
        for (let m = 1; m <= 12; m++) {
          const key = `${currentYear}-${m}`;
          const data = monthlyMap.get(key) || { total: 0, posted: 0 };
          trend.push({
            month: months[m - 1],
            year: currentYear,
            monthNum: m,
            totalDepreciation: data.total,
            postedDepreciation: data.posted,
          });
        }

        setMonthlyTrend(trend);
      } catch (err) {
        console.error('Failed to fetch inventory stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [fiscalYear]);

  return { stats, monthlyTrend, loading };
}

// KIA thresholds for Netherlands (2024)
export const KIA_THRESHOLDS_2024 = {
  minimum: 2801,
  maximum: 353973,
  brackets: [
    { min: 2801, max: 65915, percentage: 28 },
    { min: 65916, max: 131823, fixed: 15750 },
    { min: 131824, max: 353973, deductionRate: 0.0759 },
  ],
};

export function calculateKIA(totalInvestment: number): number {
  if (totalInvestment < KIA_THRESHOLDS_2024.minimum) return 0;
  if (totalInvestment > KIA_THRESHOLDS_2024.maximum) return 0;

  if (totalInvestment <= 65915) {
    return totalInvestment * 0.28;
  } else if (totalInvestment <= 131823) {
    return 15750;
  } else {
    return Math.max(0, 15750 - (totalInvestment - 131823) * 0.0759);
  }
}
