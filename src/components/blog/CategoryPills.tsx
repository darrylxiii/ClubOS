import React from 'react';
import { useTranslation } from 'react-i18next';
import { categories } from '@/data/blog';
import { cn } from '@/lib/utils';

interface CategoryPillsProps {
  activeCategory: string | null;
  onSelect: (category: string | null) => void;
}

const CategoryPills: React.FC<CategoryPillsProps> = ({ activeCategory, onSelect }) => {
  const { t } = useTranslation('common');
  return (
    <div className="flex items-center gap-6 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex-shrink-0 pb-1.5 text-body-sm font-medium tracking-wide uppercase transition-all duration-200 border-b-2",
          activeCategory === null
            ? "text-foreground border-foreground"
            : "text-muted-foreground border-transparent hover:text-foreground"
        )}
      >
        {t('blog.all')}
      </button>

      {categories.map((cat) => {
        const isActive = activeCategory === cat.slug;

        return (
          <button
            key={cat.slug}
            onClick={() => onSelect(cat.slug)}
            className={cn(
              "flex-shrink-0 pb-1.5 text-body-sm font-medium tracking-wide uppercase transition-all duration-200 border-b-2",
              isActive
                ? "text-foreground border-foreground"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryPills;
