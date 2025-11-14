import { memo } from 'react';
import { Star } from 'lucide-react';

interface AverageRatingDisplayProps {
  rating: number;
  count: number;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AverageRatingDisplay = memo<AverageRatingDisplayProps>(({
  rating,
  count,
  showCount = true,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (!rating || count === 0) return null;

  return (
    <div className={`flex items-center gap-1 ${sizeClasses[size]}`}>
      <Star className={`${iconSizes[size]} fill-amber-400 text-amber-400`} />
      <span className="font-medium">{rating.toFixed(1)}</span>
      {showCount && (
        <span className="text-muted-foreground">({count})</span>
      )}
    </div>
  );
});

AverageRatingDisplay.displayName = 'AverageRatingDisplay';
