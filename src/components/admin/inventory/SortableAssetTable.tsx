import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AssetStatusBadge } from '@/components/ui/UnifiedStatusBadge';
import { AssetDetailDrawer } from './AssetDetailDrawer';
import { CATEGORY_LABELS } from '@/hooks/useInventoryCategories';
import type { InventoryAsset, AssetStatus } from '@/hooks/useInventoryAssets';
import { Edit, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, FileText, Eye, Wrench, Trash2, RotateCcw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

interface SortableAssetTableProps {
  assets: InventoryAsset[];
  onEdit: (asset: InventoryAsset) => void;
  onStatusChange: (id: string, status: AssetStatus) => void;
}

type SortField = 'inventory_number' | 'asset_name' | 'category' | 'total_purchase_value' | 'current_book_value' | 'purchase_date' | 'status';
type SortDirection = 'asc' | 'desc';

export function SortableAssetTable({ assets, onEdit, onStatusChange }: SortableAssetTableProps) {
  const [sortField, setSortField] = useState<SortField>('inventory_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedAsset, setSelectedAsset] = useState<InventoryAsset | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (asset: InventoryAsset) => {
    setSelectedAsset(asset);
    setDrawerOpen(true);
  };

  const sortedAssets = [...assets].sort((a, b) => {
    let aVal: string | number | null = null;
    let bVal: string | number | null = null;

    switch (sortField) {
      case 'inventory_number':
        aVal = a.inventory_number;
        bVal = b.inventory_number;
        break;
      case 'asset_name':
        aVal = a.asset_name.toLowerCase();
        bVal = b.asset_name.toLowerCase();
        break;
      case 'category':
        aVal = CATEGORY_LABELS[a.category] || a.category;
        bVal = CATEGORY_LABELS[b.category] || b.category;
        break;
      case 'total_purchase_value':
        aVal = a.total_purchase_value || 0;
        bVal = b.total_purchase_value || 0;
        break;
      case 'current_book_value':
        aVal = a.current_book_value || 0;
        bVal = b.current_book_value || 0;
        break;
      case 'purchase_date':
        aVal = new Date(a.purchase_date).getTime();
        bVal = new Date(b.purchase_date).getTime();
        break;
      case 'status':
        aVal = a.status || '';
        bVal = b.status || '';
        break;
    }

    if (aVal === null) return 1;
    if (bVal === null) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center hover:text-foreground transition-colors"
      >
        {children}
        <SortIcon field={field} />
      </button>
    </TableHead>
  );

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="inventory_number">Inventory #</SortableHeader>
              <SortableHeader field="asset_name">Name</SortableHeader>
              <SortableHeader field="category">Category</SortableHeader>
              <SortableHeader field="purchase_date">Purchase Date</SortableHeader>
              <SortableHeader field="total_purchase_value" className="text-right">Purchase Value</SortableHeader>
              <SortableHeader field="current_book_value" className="text-right">Book Value</SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No assets found
                </TableCell>
              </TableRow>
            ) : (
              sortedAssets.map((asset) => (
                <TableRow 
                  key={asset.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(asset)}
                >
                  <TableCell className="font-mono text-sm">{asset.inventory_number}</TableCell>
                  <TableCell>
                    <div className="font-medium">{asset.asset_name}</div>
                    {asset.supplier && <div className="text-xs text-muted-foreground">{asset.supplier}</div>}
                  </TableCell>
                  <TableCell>{CATEGORY_LABELS[asset.category] || asset.category}</TableCell>
                  <TableCell>{format(new Date(asset.purchase_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(asset.total_purchase_value)}</TableCell>
                  <TableCell className="text-right">
                    <div>{formatCurrency(asset.current_book_value)}</div>
                    {asset.accumulated_depreciation && asset.accumulated_depreciation > 0 && (
                      <div className="text-xs text-muted-foreground">
                        -{formatCurrency(asset.accumulated_depreciation)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell><AssetStatusBadge status={asset.status || 'active'} size="sm" /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRowClick(asset)}>
                          <Eye className="h-4 w-4 mr-2" />View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(asset)}>
                          <Edit className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        {asset.invoice_file_url && (
                          <DropdownMenuItem asChild>
                            <a href={asset.invoice_file_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4 mr-2" />View Document
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        
                        {/* Status transitions */}
                        {asset.status === 'active' && (
                          <>
                            <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'under_maintenance')}>
                              <Wrench className="h-4 w-4 mr-2" />Mark Under Maintenance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'disposed')}>
                              <Trash2 className="h-4 w-4 mr-2" />Dispose Asset
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'sold')}>
                              Mark as Sold
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {asset.status === 'under_maintenance' && (
                          <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'active')}>
                            <RotateCcw className="h-4 w-4 mr-2" />Return to Active
                          </DropdownMenuItem>
                        )}
                        
                        {(asset.status === 'disposed' || asset.status === 'sold' || asset.status === 'written_off') && (
                          <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'active')}>
                            <RotateCcw className="h-4 w-4 mr-2" />Restore to Active
                          </DropdownMenuItem>
                        )}
                        
                        {asset.status !== 'written_off' && asset.status !== 'disposed' && (
                          <DropdownMenuItem onClick={() => onStatusChange(asset.id, 'written_off')} className="text-destructive">
                            Write Off
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AssetDetailDrawer
        asset={selectedAsset}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={onEdit}
        onStatusChange={onStatusChange}
      />
    </>
  );
}
