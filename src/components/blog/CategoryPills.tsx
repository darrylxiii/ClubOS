import React from 'react';
import { categories } from '@/data/blog';
import { cn } from '@/lib/utils';
import { Briefcase, TrendingUp, BarChart3, Users } from 'lucide-react';

interface CategoryPillsProps {
  activeCategory: string | null;
  onSelect: (category: string | null) => void;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Briefcase,
  TrendingUp,
  BarChart3,
  Users,
};

const CategoryPills: React.FC<CategoryPillsProps> = ({ activeCategory, onSelect }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
          activeCategory === null
            ? "bg-accent text-accent-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )}
      >
        All
      </button>

      {categories.map((cat) => {
        const Icon = iconMap[cat.icon];
        const isActive = activeCategory === cat.slug;

        return (
          <button
            key={cat.slug}
            onClick={() => onSelect(cat.slug)}
            className={cn(
              "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              isActive
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryPills;
