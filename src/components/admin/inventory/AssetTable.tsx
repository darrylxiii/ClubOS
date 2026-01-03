import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AssetStatusBadge } from '@/components/ui/UnifiedStatusBadge';
import { CATEGORY_LABELS } from '@/hooks/useInventoryCategories';
import type { InventoryAsset } from '@/hooks/useInventoryAssets';
import { Edit, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface AssetTableProps {
  assets: InventoryAsset[];
  onEdit: (asset: InventoryAsset) => void;
  onStatusChange: (id: string, status: 'active' | 'fully_depreciated' | 'sold' | 'written_off') => void;
}

const formatCurrency = (value: number | null) => {
  if (value === null) return '€0,00';
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);
};

export function AssetTable({ assets, onEdit, onStatusChange }: AssetTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Inventory #</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Purchase Value</TableHead>
            <TableHead className="text-right">Book Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No assets found
              </TableCell>
            </TableRow>
          ) : (
            assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-mono text-sm">{asset.inventory_number}</TableCell>
                <TableCell className="font-medium">{asset.asset_name}</TableCell>
                <TableCell>{CATEGORY_LABELS[asset.category] || asset.category}</TableCell>
                <TableCell className="text-right">{formatCurrency(asset.total_purchase_value)}</TableCell>
                <TableCell className="text-right">{formatCurrency(asset.current_book_value)}</TableCell>
                <TableCell><AssetStatusBadge status={asset.status || 'active'} size="sm" /></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(asset)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      {asset.status !== 'sold' && <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'sold')}>Mark as Sold</DropdownMenuItem>}
                      {asset.status !== 'written_off' && <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'written_off')}>Write Off</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
