import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { LucideIcon, TrendingUp, Code, Users, Crown, Palette, BarChart } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  course_count?: number;
}

interface CategoryGridProps {
  categories: Category[];
  onCategoryClick: (slug: string) => void;
}

const iconMap: Record<string, LucideIcon> = {
  TrendingUp,
  Code,
  Users,
  Crown,
  Palette,
  BarChart,
};

export const CategoryGrid = memo<CategoryGridProps>(({
  categories,
  onCategoryClick,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {categories.map((category) => {
        const Icon = iconMap[category.icon] || TrendingUp;
        
        return (
          <Card
            key={category.id}
            className="p-4 hover:bg-accent cursor-pointer transition-all hover:shadow-md group"
            onClick={() => onCategoryClick(category.slug)}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{category.name}</p>
                {category.course_count !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {category.course_count} {category.course_count === 1 ? 'course' : 'courses'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
});

CategoryGrid.displayName = 'CategoryGrid';
