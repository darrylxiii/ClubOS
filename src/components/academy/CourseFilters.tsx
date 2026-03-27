import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CourseFiltersProps {
  categories: string[];
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  difficulty: string;
  onDifficultyChange: (difficulty: string) => void;
  duration: string;
  onDurationChange: (duration: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onReset: () => void;
}

export const CourseFilters = memo<CourseFiltersProps>(({
  categories,
  selectedCategories,
  onCategoryChange,
  difficulty,
  onDifficultyChange,
  duration,
  onDurationChange,
  sortBy,
  onSortChange,
  onReset,
}) => {
  const handleCategoryToggle = (category: string) => {
  const { t } = useTranslation('common');
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoryChange([...selectedCategories, category]);
    }
  };

  const hasFilters = selectedCategories.length > 0 || difficulty !== 'all' || duration !== 'all';

  return (
    <Card className="p-4 space-y-6 sticky top-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('academy.filters')}</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <Label>{t('academy.sortBy')}</Label>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('academy.coursefilters.newest', 'Newest')}</SelectItem>
            <SelectItem value="popular">{t('academy.coursefilters.mostPopular', 'Most Popular')}</SelectItem>
            <SelectItem value="shortest">{t('academy.coursefilters.shortestFirst', 'Shortest First')}</SelectItem>
            <SelectItem value="highest_rated">{t('academy.coursefilters.highestRated', 'Highest Rated')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>{t('academy.categories')}</Label>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category}`}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => handleCategoryToggle(category)}
              />
              <label
                htmlFor={`category-${category}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {category}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>{t('academy.difficulty')}</Label>
        <Select value={difficulty} onValueChange={onDifficultyChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('academy.coursefilters.allLevels', 'All Levels')}</SelectItem>
            <SelectItem value="beginner">{t('academy.coursefilters.beginner', 'Beginner')}</SelectItem>
            <SelectItem value="intermediate">{t('academy.coursefilters.intermediate', 'Intermediate')}</SelectItem>
            <SelectItem value="advanced">{t('academy.coursefilters.advanced', 'Advanced')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>{t('academy.duration')}</Label>
        <Select value={duration} onValueChange={onDurationChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('academy.coursefilters.anyDuration', 'Any Duration')}</SelectItem>
            <SelectItem value="short">{t('academy.coursefilters.under2Hours', 'Under 2 hours')}</SelectItem>
            <SelectItem value="medium">2-5 hours</SelectItem>
            <SelectItem value="long">5+ hours</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
});

CourseFilters.displayName = 'CourseFilters';
