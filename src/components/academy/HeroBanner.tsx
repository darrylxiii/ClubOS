import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Star, Play, Users, Clock, ArrowRight, TrendingUp } from 'lucide-react';

interface FeaturedCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  course_image_url?: string;
  enrolled_count?: number;
  estimated_hours?: number;
  difficulty_level?: string;
  category?: string;
}

export const HeroBanner = () => {
  const { t } = useTranslation('common');
  const [featuredCourse, setFeaturedCourse] = useState<FeaturedCourse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedCourse = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, slug, description, course_image_url, enrolled_count, estimated_hours, difficulty_level, category')
        .eq('is_featured', true)
        .eq('is_published', true)
        .gte('featured_until', new Date().toISOString())
        .order('featured_until', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setFeaturedCourse(data as FeaturedCourse);
      } else {
        const { data: popular } = await supabase
          .from('courses')
          .select('id, title, slug, description, course_image_url, enrolled_count, estimated_hours, difficulty_level, category')
          .eq('is_published', true)
          .order('enrolled_count', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (popular) setFeaturedCourse(popular as FeaturedCourse);
      }
      setLoading(false);
    };

    fetchFeaturedCourse();
  }, []);

  if (loading) {
    return (
      <div className="relative w-full min-h-[480px] rounded-2xl overflow-hidden border border-border/30">
        {/* Shimmer skeleton */}
        <div className="absolute inset-0 animate-shimmer rounded-2xl" />
        <div className="relative h-full min-h-[480px] flex items-center px-8 md:px-12">
          <div className="space-y-5 w-full max-w-xl">
            <div className="h-8 w-40 rounded-full animate-shimmer" />
            <div className="flex gap-2">
              <div className="h-6 w-24 rounded-md animate-shimmer" />
              <div className="h-6 w-20 rounded-md animate-shimmer" />
            </div>
            <div className="space-y-3">
              <div className="h-12 w-full rounded-lg animate-shimmer" />
              <div className="h-12 w-3/4 rounded-lg animate-shimmer" />
            </div>
            <div className="h-5 w-full max-w-lg rounded animate-shimmer" />
            <div className="h-5 w-2/3 rounded animate-shimmer" />
            <div className="flex gap-5">
              <div className="h-5 w-28 rounded animate-shimmer" />
              <div className="h-5 w-20 rounded animate-shimmer" />
            </div>
            <div className="h-14 w-52 rounded-xl animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!featuredCourse) return null;

  const enrolledDisplay = featuredCourse.enrolled_count && featuredCourse.enrolled_count > 0
    ? featuredCourse.enrolled_count >= 1000
      ? `${(featuredCourse.enrolled_count / 1000).toFixed(1)}k`
      : String(featuredCourse.enrolled_count)
    : null;

  return (
    <div className="relative w-full">
      {/* Ambient glow behind the banner */}
      <div
        className="absolute -inset-4 z-0 rounded-3xl opacity-60 blur-2xl pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 50%, hsl(var(--primary) / 0.08) 0%, transparent 70%), radial-gradient(ellipse at 80% 30%, hsl(var(--primary) / 0.05) 0%, transparent 60%)',
        }}
      />

      {/* Main banner container */}
      <div className="relative z-10 w-full min-h-[480px] rounded-2xl overflow-hidden group border border-border/20">
        {/* Background Image */}
        <div className="absolute inset-0">
          {featuredCourse.course_image_url ? (
            <img
              src={featuredCourse.course_image_url}
              alt={featuredCourse.title}
              className="w-full h-full object-cover brightness-75 group-hover:brightness-90 group-hover:scale-[1.04] transition-all duration-[1.4s] ease-out"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/20" />
          )}
        </div>

        {/* Multi-layer gradient overlays */}
        {/* Base: strong left fade for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
        {/* Bottom fade for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        {/* Top vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-transparent" />
        {/* Subtle noise/grain texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
            backgroundSize: '128px 128px',
          }}
        />

        {/* Glass stat pills - right side floating badges */}
        <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-3">
          {enrolledDisplay && (
            <div className="glass-subtle rounded-xl px-4 py-2.5 backdrop-blur-xl flex items-center gap-2.5 shadow-lg">
              <Users className="h-4 w-4 text-primary" />
              <div className="text-right">
                <p className="text-sm font-semibold leading-none">{enrolledDisplay}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">enrolled</p>
              </div>
            </div>
          )}
          {featuredCourse.estimated_hours && (
            <div className="glass-subtle rounded-xl px-4 py-2.5 backdrop-blur-xl flex items-center gap-2.5 shadow-lg">
              <Clock className="h-4 w-4 text-primary" />
              <div className="text-right">
                <p className="text-sm font-semibold leading-none">{featuredCourse.estimated_hours}h</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">duration</p>
              </div>
            </div>
          )}
          <div className="glass-subtle rounded-xl px-4 py-2.5 backdrop-blur-xl flex items-center gap-2.5 shadow-lg">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <div className="text-right">
              <p className="text-sm font-semibold leading-none">4.9</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">rating</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full min-h-[480px] flex items-center px-8 md:px-12">
          <div className="max-w-xl space-y-5">
            {/* Featured Badge with pulsing dot */}
            <div className="inline-flex items-center gap-2.5 glass-subtle px-4 py-1.5 rounded-full text-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{t('academy.featuredCourseOfTheWeek', 'Featured Course')}</span>
            </div>

            {/* Category + Difficulty */}
            <div className="flex items-center gap-2">
              {featuredCourse.category && (
                <Badge variant="secondary" className="glass-subtle border-0 text-xs">
                  {featuredCourse.category}
                </Badge>
              )}
              {featuredCourse.difficulty_level && (
                <Badge variant="outline" className="text-xs capitalize border-border/40">
                  {featuredCourse.difficulty_level}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight">
              {featuredCourse.title}
            </h1>

            {/* Description */}
            <p className="text-base text-muted-foreground line-clamp-2 max-w-lg leading-relaxed">
              {featuredCourse.description}
            </p>

            {/* Stats Row - visible on mobile since pills are hidden */}
            <div className="flex items-center gap-5 text-sm text-muted-foreground md:hidden">
              {featuredCourse.enrolled_count != null && featuredCourse.enrolled_count > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>{featuredCourse.enrolled_count} learners</span>
                </div>
              )}
              {featuredCourse.estimated_hours && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{featuredCourse.estimated_hours}h</span>
                </div>
              )}
            </div>

            {/* Premium CTA */}
            <Link to={`/courses/${featuredCourse.slug}`}>
              <Button
                size="lg"
                className="group/btn gap-2.5 text-base font-semibold px-8 h-14 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <Play className="h-4 w-4 fill-current" />
                {t('academy.startLearning', 'Start Learning')}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
