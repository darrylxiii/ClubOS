import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Palette,
  Briefcase,
  Code2,
  Megaphone,
  Crown,
  BarChart3,
  Package,
  Layers,
  type LucideIcon,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
  course_count: number;
}

interface EnhancedCategoryGridProps {
  onCategoryClick?: (categoryId: string) => void;
}

const categoryIconMap: Record<string, LucideIcon> = {
  Design: Palette,
  Business: Briefcase,
  Code: Code2,
  Engineering: Code2,
  Marketing: Megaphone,
  Leadership: Crown,
  Data: BarChart3,
  'Data Science': BarChart3,
  Product: Package,
  'Product Management': Package,
  Sales: Briefcase,
};

function getIconForCategory(name: string): LucideIcon {
  if (categoryIconMap[name]) return categoryIconMap[name];
  const key = Object.keys(categoryIconMap).find((k) =>
    name.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? categoryIconMap[key] : Layers;
}

export const EnhancedCategoryGrid = ({ onCategoryClick }: EnhancedCategoryGridProps) => {
  const { t } = useTranslation('common');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('category')
        .not('category', 'is', null);

      if (coursesData) {
        const categoryMap = new Map<string, number>();
        coursesData.forEach((course: any) => {
          const cat = course.category;
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
        });

        const categoriesArray = Array.from(categoryMap.entries())
          .slice(0, 6)
          .map(([name, count]) => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            course_count: count,
          }));

        setCategories(categoriesArray);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-subtle rounded-2xl h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">{t('academy.browseByCategory')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {categories.map((category) => {
          const Icon = getIconForCategory(category.name);
          return (
            <div
              key={category.id}
              className={cn(
                'glass-subtle rounded-2xl hover-lift cursor-pointer',
                'border border-transparent hover:border-primary/20',
                'flex flex-col items-center justify-center p-5 gap-3 transition-all',
              )}
              onClick={() => onCategoryClick?.(category.id)}
            >
              <div className="glass rounded-xl p-3 bg-primary/5">
                <Icon className="h-6 w-6 text-foreground/80" />
              </div>
              <span className="text-sm font-medium text-center leading-tight">
                {category.name}
              </span>
              <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
                {category.course_count} courses
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
