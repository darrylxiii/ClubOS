import { Badge } from '@/components/ui/badge';
import type { AssetStatus } from '@/hooks/useInventoryAssets';

interface AssetStatusBadgeProps {
  status: AssetStatus | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  fully_depreciated: { label: 'Fully Depreciated', variant: 'secondary' },
  sold: { label: 'Sold', variant: 'outline' },
  written_off: { label: 'Written Off', variant: 'destructive' },
};

export function AssetStatusBadge({ status }: AssetStatusBadgeProps) {
  const config = statusConfig[status || 'active'] || statusConfig.active;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
