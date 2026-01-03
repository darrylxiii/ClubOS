import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountStatus } from '@/hooks/useGodMode';
import { AccountStatusBadge as UnifiedAccountStatusBadge } from '@/components/ui/UnifiedStatusBadge';

interface AccountStatusBadgeProps {
  status?: AccountStatus;
  isSuperAdmin?: boolean;
  className?: string;
  showIcon?: boolean;
}

/**
 * Account status badge with super admin indicator
 * Delegates to UnifiedStatusBadge for consistent styling
 */
export function AccountStatusBadge({ 
  status = 'active', 
  isSuperAdmin = false,
  className,
  showIcon = true,
}: AccountStatusBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {isSuperAdmin && (
        <Badge 
          variant="outline" 
          className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
        >
          <Crown className="h-3 w-3" />
          Super
        </Badge>
      )}
      <UnifiedAccountStatusBadge 
        status={status} 
        showIcon={showIcon}
        size="sm"
      />
    </div>
  );
}
