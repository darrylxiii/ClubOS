import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Search, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useInventoryAssets, type AssetStatus, type AssetCategory } from "@/hooks/useInventoryAssets";
import { AssetTable } from "@/components/admin/inventory/AssetTable";
import { CATEGORY_LABELS } from "@/hooks/useInventoryCategories";
import { Skeleton } from "@/components/ui/skeleton";

const AssetRegister = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");
  
  const { assets, loading, refetch, changeStatus } = useInventoryAssets({
    search: search || undefined,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const formatCurrency = (v: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);
  const totalValue = assets.reduce((s, a) => s + (a.total_purchase_value || 0), 0);
  const totalBookValue = assets.reduce((s, a) => s + (a.current_book_value || 0), 0);

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Asset Register</h1>
              <p className="text-muted-foreground">Manage all company assets</p>
            </div>
            <Button><Plus className="h-4 w-4 mr-2" />Add Asset</Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{assets.length}</div><p className="text-muted-foreground text-sm">Total Assets</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{assets.filter(a => a.status === 'active').length}</div><p className="text-muted-foreground text-sm">Active</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatCurrency(totalValue)}</div><p className="text-muted-foreground text-sm">Purchase Value</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatCurrency(totalBookValue)}</div><p className="text-muted-foreground text-sm">Book Value</p></CardContent></Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as AssetCategory | "all")}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AssetStatus | "all")}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="fully_depreciated">Fully Depreciated</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="written_off">Written Off</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />All Assets</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <AssetTable assets={assets} onEdit={() => {}} onStatusChange={changeStatus} />
              )}
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
};

export default AssetRegister;
