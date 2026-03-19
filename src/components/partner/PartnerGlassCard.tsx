import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PartnerGlassCardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export function PartnerGlassCard({
  title,
  description,
  icon,
  badge,
  headerAction,
  children,
  className,
  contentClassName,
  noPadding,
}: PartnerGlassCardProps) {
  return (
    <Card className={cn(
      'bg-card/30 backdrop-blur border-border/20',
      className
    )}>
      {(title || description) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <div>
                <CardTitle className="flex items-center gap-2">
                  {title}
                  {badge}
                </CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
              </div>
            </div>
            {headerAction}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn(noPadding && 'p-0', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
