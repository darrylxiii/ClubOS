import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  course_image_url?: string;
  estimated_hours?: number;
  enrolled_count?: number;
  trending_score?: number;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
  progress?: number;
}

interface CourseCarouselProps {
  title: string;
  courses: Course[];
  viewAllLink?: string;
  showTrending?: boolean;
  showProgress?: boolean;
}

export const CourseCarousel = ({ title, courses, viewAllLink, showTrending, showProgress }: CourseCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {viewAllLink && (
            <Link to={viewAllLink}>
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          )}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      >
        {courses.map((course) => (
          <Link
            key={course.id}
            to={`/academy/courses/${course.slug}`}
            className="snap-start"
          >
            <Card className="w-[300px] hover:shadow-lg transition-all hover:-translate-y-1 group">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {course.course_image_url ? (
                    <img
                      src={course.course_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-muted-foreground">No image</span>
                    </div>
                  )}
                  {showTrending && course.trending_score && course.trending_score > 5 && (
                    <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                      🔥 Trending
                    </div>
                  )}
                  {course.enrolled_count && course.enrolled_count > 0 && !showProgress && (
                    <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs">
                      {course.enrolled_count} enrolled
                    </div>
                  )}
                  {showProgress && (
                    <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{course.progress || 0}%</span>
                      </div>
                      <Progress value={course.progress || 0} className="h-1.5" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>
                  {course.estimated_hours && (
                    <p className="text-xs text-muted-foreground">
                      {course.estimated_hours}h course
                    </p>
                  )}

                  {/* Instructor */}
                  {course.profiles && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={course.profiles.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {course.profiles.full_name?.charAt(0) || 'E'}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-medium truncate">
                        {course.profiles.full_name || 'Expert Instructor'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
