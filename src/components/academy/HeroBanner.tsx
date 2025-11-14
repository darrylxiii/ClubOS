import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Star } from 'lucide-react';

interface FeaturedCourse {
  id: string;
  title: string;
  description: string;
  course_image_url?: string;
  enrolled_count?: number;
}

export const HeroBanner = () => {
  const [featuredCourse, setFeaturedCourse] = useState<FeaturedCourse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedCourse = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, course_image_url, enrolled_count')
        .eq('is_featured', true)
        .gte('featured_until', new Date().toISOString())
        .order('featured_until', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setFeaturedCourse(data as any);
      } else {
        // Fallback: get most popular course
        const { data: popular } = await supabase
          .from('courses')
          .select('id, title, description, course_image_url, enrolled_count')
          .order('enrolled_count', { ascending: false })
          .limit(1)
          .single();

        if (popular) setFeaturedCourse(popular as any);
      }
      setLoading(false);
    };

    fetchFeaturedCourse();
  }, []);

  if (loading) {
    return (
      <div className="relative w-full h-[400px] rounded-xl bg-muted animate-pulse" />
    );
  }

  if (!featuredCourse) return null;

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden group">
      {/* Background Image with Parallax */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20">
        {featuredCourse.course_image_url && (
          <img
            src={featuredCourse.course_image_url}
            alt={featuredCourse.title}
            className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
          />
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex items-center px-12">
        <div className="max-w-2xl space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
            <Star className="h-4 w-4 text-primary fill-primary" />
            <span className="text-sm font-semibold text-primary">Featured Course of the Week</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-bold leading-tight">
            {featuredCourse.title}
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground line-clamp-3">
            {featuredCourse.description}
          </p>

          {/* Stats & CTA */}
          <div className="flex items-center gap-6">
            {featuredCourse.enrolled_count && featuredCourse.enrolled_count > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-foreground">{featuredCourse.enrolled_count}</span>
                <span className="text-muted-foreground"> learners enrolled</span>
              </div>
            )}

            <Link to={`/academy/course/${featuredCourse.id}`}>
              <Button size="lg" className="hover:scale-105 transition-transform">
                Start Learning
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
