import { AssetStatusBadge as UnifiedAssetStatusBadge } from '@/components/ui/UnifiedStatusBadge';
import type { AssetStatus } from '@/hooks/useInventoryAssets';

interface AssetStatusBadgeProps {
  status: AssetStatus | null;
}

/**
 * Asset status badge - delegates to unified system
 */
export function AssetStatusBadge({ status }: AssetStatusBadgeProps) {
  return <UnifiedAssetStatusBadge status={status || 'active'} size="sm" />;
}
