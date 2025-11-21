import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  columns?: 1 | 2 | 3;
}

export const DashboardSection = ({
  children,
  title,
  description,
  icon: Icon,
  className,
  columns = 1,
}: DashboardSectionProps) => {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[columns];

  return (
    <section className={cn("space-y-4 animate-fade-in", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {Icon && <Icon className="h-6 w-6 text-primary" />}
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className={cn("grid gap-6", gridClass)}>
        {children}
      </div>
    </section>
  );
};
