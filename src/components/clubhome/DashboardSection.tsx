import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DashboardSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  mobileColumns?: 1 | 2;
}

export const DashboardSection = ({
  children,
  title,
  description,
  icon: Icon,
  className,
  columns = 1,
  mobileColumns = 1,
}: DashboardSectionProps) => {
  const gridClass = {
    1: 'grid-cols-1',
    2: `grid-cols-${mobileColumns} lg:grid-cols-2`,
    3: `grid-cols-${mobileColumns} sm:grid-cols-2 lg:grid-cols-3`,
    4: `grid-cols-${mobileColumns} sm:grid-cols-2 lg:grid-cols-4`,
  }[columns];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("space-y-3 sm:space-y-4", className)}
    >
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
              {title}
            </h2>
          )}
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className={cn("grid gap-4 sm:gap-6", gridClass)}>
        {children}
      </div>
    </motion.section>
  );
};
