import { Badge } from '@/components/ui/badge';
import { 
  Ban, 
  ShieldAlert, 
  CheckCircle, 
  XCircle,
  Eye,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccountStatus } from '@/hooks/useGodMode';

interface AccountStatusBadgeProps {
  status?: AccountStatus;
  isSuperAdmin?: boolean;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<AccountStatus, { 
  label: string; 
  color: string; 
  icon: React.ReactNode;
}> = {
  active: { 
    label: 'Active', 
    color: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20', 
    icon: <CheckCircle className="h-3 w-3" /> 
  },
  suspended: { 
    label: 'Suspended', 
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20', 
    icon: <ShieldAlert className="h-3 w-3" /> 
  },
  banned: { 
    label: 'Banned', 
    color: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20', 
    icon: <Ban className="h-3 w-3" /> 
  },
  pending_review: { 
    label: 'Pending', 
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20', 
    icon: <Eye className="h-3 w-3" /> 
  },
  read_only: { 
    label: 'Read Only', 
    color: 'bg-muted text-muted-foreground border-border hover:bg-muted/80', 
    icon: <XCircle className="h-3 w-3" /> 
  },
};

export function AccountStatusBadge({ 
  status = 'active', 
  isSuperAdmin = false,
  className,
  showIcon = true,
}: AccountStatusBadgeProps) {
  const config = statusConfig[status];

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
      <Badge variant="outline" className={cn('gap-1', config.color)}>
        {showIcon && config.icon}
        {config.label}
      </Badge>
    </div>
  );
}
