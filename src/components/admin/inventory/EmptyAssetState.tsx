import { Button } from '@/components/ui/button';
import { Package, X, Plus } from 'lucide-react';

interface EmptyAssetStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onAddAsset?: () => void;
}

export function EmptyAssetState({ hasFilters, onClearFilters, onAddAsset }: EmptyAssetStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No assets match your filters</h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-sm">
          Try adjusting your search criteria or clearing the filters to see all assets.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No assets yet</h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-sm">
        Start by adding your first asset to track depreciation and manage your inventory.
      </p>
      {onAddAsset && (
        <Button onClick={onAddAsset}>
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Asset
        </Button>
      )}
    </div>
  );
}
