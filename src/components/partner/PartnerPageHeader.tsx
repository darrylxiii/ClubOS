import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface PartnerPageHeaderProps {
  title: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PartnerPageHeader = memo(({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  actions,
  className,
}: PartnerPageHeaderProps) => {
  const { t } = useTranslation('partner');
  const [searchOpen, setSearchOpen] = useState(false);
  const hasSearch = onSearchChange !== undefined;

  return (
    <div className={cn('flex items-center justify-between gap-4 py-2', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasSearch && (
          <div className={cn(
            'relative transition-all duration-200',
            searchOpen ? 'w-64' : 'w-8'
          )}>
            {searchOpen ? (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9 pr-8 h-9 bg-card/50 border-border/30"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-8"
                  onClick={() => {
                    setSearchOpen(false);
                    onSearchChange?.('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setSearchOpen(true)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('common:search')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {actions}
      </div>
    </div>
  );
});

PartnerPageHeader.displayName = 'PartnerPageHeader';
