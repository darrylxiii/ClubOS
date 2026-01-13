import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Eye, MousePointerClick, Sparkles, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { extractDomain } from '@/lib/linkPreviewUtils';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';

interface NewsArticleCardProps {
  article: {
    id: string;
    url: string;
    title: string;
    description?: string | null;
    image_url?: string | null;
    published_date?: string | null;
    source_name?: string | null;
    author?: string | null;
    view_count: number;
    click_count: number;
    tags?: string[] | null;
    is_featured: boolean;
    is_pinned: boolean;
  };
  companyLogoUrl?: string | null;
  onRead?: () => void;
  className?: string;
}

export function NewsArticleCard({ article, companyLogoUrl, onRead, className }: NewsArticleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  // Track view when card appears in viewport
  useEffect(() => {
    if (hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView.current) {
          hasTrackedView.current = true;
          incrementViewCount();
        }
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [article.id]);

  const incrementViewCount = async () => {
    try {
      await supabase
        .from('company_news_articles')
        .update({ view_count: article.view_count + 1 })
        .eq('id', article.id);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleReadClick = async () => {
    try {
      await supabase
        .from('company_news_articles')
        .update({ click_count: article.click_count + 1 })
        .eq('id', article.id);
      
      if (onRead) {
        onRead();
      }
    } catch (error) {
      console.error('Error incrementing click count:', error);
    }
  };

  const displayImage = article.image_url || companyLogoUrl || '/placeholder.svg';
  const domain = extractDomain(article.url);

  return (
    <Card 
      ref={cardRef}
      className={cn(
        'overflow-hidden border border-border/50 transition-all duration-300',
        'hover:shadow-lg hover:border-primary/30',
        article.is_pinned && 'bg-accent/5',
        className
      )}
    >
      {/* Image - OPTIMIZED: Added explicit dimensions to prevent CLS */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={displayImage}
          alt={article.title}
          width={400}
          height={225}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {article.is_pinned && (
            <Badge className="bg-purple-500 hover:bg-purple-600 text-white gap-1">
              <Pin className="w-3 h-3" />
              Pinned
            </Badge>
          )}
          {article.is_featured && (
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1">
              <Sparkles className="w-3 h-3" />
              Featured
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Source & Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {article.source_name && (
            <>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20">
                {article.source_name}
              </Badge>
              <span>•</span>
            </>
          )}
          {article.published_date && (
            <time>{format(new Date(article.published_date), 'MMM d, yyyy')}</time>
          )}
          {!article.published_date && <span>{domain}</span>}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base line-clamp-2 text-foreground">
          {article.title}
        </h3>

        {/* Description */}
        {article.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {article.description}
          </p>
        )}

        {/* Author */}
        {article.author && (
          <p className="text-xs text-muted-foreground">
            By {article.author}
          </p>
        )}

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {article.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {article.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{article.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Stats & CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {article.view_count}
            </span>
            <span className="flex items-center gap-1">
              <MousePointerClick className="w-3.5 h-3.5" />
              {article.click_count}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            asChild
            onClick={handleReadClick}
          >
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              Read Article
              <ExternalLink className="w-3 h-3 ml-1.5" />
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
}
