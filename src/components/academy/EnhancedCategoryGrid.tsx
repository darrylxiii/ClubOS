import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
  course_count: number;
}

interface EnhancedCategoryGridProps {
  onCategoryClick?: (categoryId: string) => void;
}

const categoryGradients = [
  'from-blue-500/20 to-cyan-500/20',
  'from-purple-500/20 to-pink-500/20',
  'from-orange-500/20 to-red-500/20',
  'from-green-500/20 to-emerald-500/20',
  'from-yellow-500/20 to-amber-500/20',
  'from-indigo-500/20 to-violet-500/20',
];

export const EnhancedCategoryGrid = ({ onCategoryClick }: EnhancedCategoryGridProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      // Get distinct categories from courses table
      const { data: coursesData } = await supabase
        .from('courses')
        .select('category')
        .not('category', 'is', null);

      if (coursesData) {
        // Count courses per category
        const categoryMap = new Map<string, number>();
        coursesData.forEach((course: any) => {
          const cat = course.category;
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
        });

        // Create category objects with icons
        const categoryIcons: Record<string, string> = {
          'Product Management': '📊',
          'Engineering': '⚙️',
          'Design': '🎨',
          'Data Science': '📈',
          'Marketing': '📣',
          'Sales': '💼',
        };

        const categoriesArray = Array.from(categoryMap.entries())
          .slice(0, 6)
          .map(([name, count], index) => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            icon: categoryIcons[name] || '📚',
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
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Browse by Category</h2>
      <div className="grid grid-cols-3 gap-4">
        {categories.map((category, index) => (
          <Card
            key={category.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group',
              'bg-gradient-to-br',
              categoryGradients[index % categoryGradients.length]
            )}
            onClick={() => onCategoryClick?.(category.id)}
          >
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start justify-between">
                <span className="text-4xl">{category.icon}</span>
                <span className="text-xs font-semibold bg-background/50 px-2 py-1 rounded-full">
                  {category.course_count} courses
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {category.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
