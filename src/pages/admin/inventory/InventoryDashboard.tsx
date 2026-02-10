import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Package, TrendingDown, Calculator, Euro } from "lucide-react";
import { useInventoryStats, calculateKIA } from "@/hooks/useInventoryStats";
import { CATEGORY_LABELS } from "@/hooks/useInventoryCategories";
import { Skeleton } from "@/components/ui/skeleton";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { CategoryPieChart } from "@/components/admin/inventory/CategoryPieChart";
import { useNavigate } from "react-router-dom";

const formatCurrency = (v: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);

const InventoryDashboard = () => {
  const { stats, monthlyTrend, loading } = useInventoryStats();
  const navigate = useNavigate();
  const kiaDeduction = stats ? calculateKIA(stats.totalPurchaseValue) : 0;

  const handleCategoryClick = (category: string) => {
    navigate(`/admin/finance?tab=assets&category=${category}`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!stats) {
    return <p className="text-muted-foreground text-center py-8">No inventory data available.</p>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/finance?tab=assets')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Package className="h-4 w-4" />Total Assets
            </div>
            <div className="text-2xl font-bold">{stats.totalAssets}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.activeAssets} active
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Euro className="h-4 w-4" />Purchase Value
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPurchaseValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Euro className="h-4 w-4" />Book Value
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBookValue)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              -{formatCurrency(stats.totalAccumulatedDepreciation)} depreciated
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/finance?tab=depreciation')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingDown className="h-4 w-4" />Monthly Depr.
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyDepreciation)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(stats.annualDepreciation)}/year
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/admin/finance?tab=kia')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calculator className="h-4 w-4" />KIA Eligible
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.kiaEligibleTotal)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.kiaEligibleCount} assets
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calculator className="h-4 w-4" />KIA Deduction
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(kiaDeduction)}</div>
            <div className="text-xs text-green-600 mt-1">
              Tax saving: {formatCurrency(kiaDeduction * 0.258)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Depreciation Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicChart
              type="bar"
              data={monthlyTrend}
              height={300}
              config={{
                xAxisKey: 'month',
                bars: [
                  { dataKey: 'totalDepreciation', fill: 'hsl(var(--primary))', name: 'Total', radius: [4,4,0,0] as any },
                  { dataKey: 'postedDepreciation', fill: 'hsl(142, 76%, 36%)', name: 'Posted', radius: [4,4,0,0] as any },
                ],
                yAxisFormatter: (v: number) => `€${(v/1000).toFixed(0)}k`,
                tooltip: {
                  formatter: (v: number) => [formatCurrency(v), ''],
                },
              }}
            />
          </CardContent>
        </Card>

        <CategoryPieChart stats={stats} onCategoryClick={handleCategoryClick} />
      </div>

      {/* Recent Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Recent Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recentAssets.map(a => (
              <div 
                key={a.id} 
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate('/admin/finance?tab=assets')}
              >
                <div>
                  <div className="font-medium">{a.asset_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {a.inventory_number} • {CATEGORY_LABELS[a.category] || a.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(a.total_purchase_value || 0)}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(a.purchase_date).toLocaleDateString('nl-NL')}
                  </div>
                </div>
              </div>
            ))}
            {stats.recentAssets.length === 0 && (
              <p className="text-muted-foreground text-center py-4">No assets registered yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryDashboard;
