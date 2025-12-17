import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code } from "lucide-react";
import { useInventoryAssets } from "@/hooks/useInventoryAssets";
import { AssetTable } from "@/components/admin/inventory/AssetTable";
import { Skeleton } from "@/components/ui/skeleton";

const IntangibleAssets = () => {
  const { assets, loading, changeStatus } = useInventoryAssets({ assetType: 'intangible' });
  const formatCurrency = (v: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);
  const totalValue = assets.reduce((s, a) => s + (a.total_purchase_value || 0), 0);
  const totalBookValue = assets.reduce((s, a) => s + (a.current_book_value || 0), 0);

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Intangible Assets</h1>
            <p className="text-muted-foreground">Software licenses and development costs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{assets.length}</div><p className="text-muted-foreground text-sm">Total Intangibles</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{assets.filter(a => a.status === 'active').length}</div><p className="text-muted-foreground text-sm">Active</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatCurrency(totalValue)}</div><p className="text-muted-foreground text-sm">Total Value</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatCurrency(totalBookValue)}</div><p className="text-muted-foreground text-sm">Book Value</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" />Software & Development</CardTitle></CardHeader>
            <CardContent>
              {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
                <AssetTable assets={assets} onEdit={() => {}} onStatusChange={changeStatus} />
              )}
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
};

export default IntangibleAssets;
