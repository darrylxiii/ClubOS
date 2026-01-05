import { useState } from 'react';
import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Plus, RefreshCw } from "lucide-react";
import { useInventoryAssets, type InventoryAsset } from "@/hooks/useInventoryAssets";
import { SortableAssetTable } from "@/components/admin/inventory/SortableAssetTable";
import { AssetFormDialog } from "@/components/admin/inventory/AssetFormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";

const IntangibleAssets = () => {
  const { assets, loading, refetch, createAsset, updateAsset, changeStatus } = useInventoryAssets({ assetType: 'intangible' });
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InventoryAsset | null>(null);

  const totalValue = assets.reduce((s, a) => s + (a.total_purchase_value || 0), 0);
  const totalBookValue = assets.reduce((s, a) => s + (a.current_book_value || 0), 0);

  const handleEdit = (asset: InventoryAsset) => {
    setEditingAsset(asset);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingAsset(null);
    setFormOpen(true);
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Intangible Assets</h1>
              <p className="text-muted-foreground">Software licenses and development costs</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />Add Intangible
              </Button>
            </div>
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
              {loading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Code className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-medium">No intangible assets yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
                    Add software licenses, development costs, or other intangible assets to track their value and amortization.
                  </p>
                </div>
              ) : (
                <SortableAssetTable assets={assets} onEdit={handleEdit} onStatusChange={changeStatus} />
              )}
            </CardContent>
          </Card>

          <AssetFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            asset={editingAsset}
            onSave={createAsset}
            onUpdate={updateAsset}
          />
        </div>
      </RoleGate>
    </AppLayout>
  );
};

export default IntangibleAssets;
