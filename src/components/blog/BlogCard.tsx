import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import { BlogPost, getCategoryBySlug } from '@/data/blog';
import { cn } from '@/lib/utils';
import { highlightText } from '@/lib/highlight-utils';

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
  className?: string;
  searchQuery?: string;
  isFocused?: boolean;
}

const BlogCard: React.FC<BlogCardProps> = ({ 
  post, 
  featured = false, 
  className, 
  searchQuery,
  isFocused = false 
}) => {
  const category = getCategoryBySlug(post.category);

  return (
    <Link
      to={`/blog/${post.category}/${post.slug}`}
      className={cn(
        "group block bg-card rounded-2xl border border-border overflow-hidden",
        "transition-all duration-200 hover:border-accent/30",
        featured && "md:grid md:grid-cols-2 md:gap-0",
        isFocused && "ring-2 ring-accent ring-offset-2 ring-offset-background",
        className
      )}
      tabIndex={isFocused ? 0 : -1}
    >
      <div className={cn(
        "aspect-[16/9] bg-muted overflow-hidden",
        featured && "md:aspect-auto md:h-full"
      )}>
        <img
          src={post.heroImage.url}
          alt={post.heroImage.alt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          width={800}
          height={450}
        />
      </div>

      <div className={cn(
        "p-5 md:p-6",
        featured && "md:p-8 md:flex md:flex-col md:justify-center"
      )}>
        {category && (
          <span
            className={cn(
              "inline-block text-xs font-semibold uppercase tracking-wider mb-3",
              featured ? "text-accent" : "text-muted-foreground"
            )}
          >
            {featured && "Featured • "}
            {category.name}
          </span>
        )}

        <h3
          className={cn(
            "font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-2",
            featured ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
          )}
        >
          {searchQuery ? highlightText(post.title, searchQuery) : post.title}
        </h3>

        <p className={cn(
          "text-muted-foreground line-clamp-2 mb-4",
          featured ? "text-base md:text-lg" : "text-sm"
        )}>
          {searchQuery ? highlightText(post.excerpt, searchQuery) : post.excerpt}
        </p>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="font-medium">{post.author.name.split(' ').slice(0, 2).join(' ')}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {post.readTime} min
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {post.socialProofCount.toLocaleString()} read today
          </span>
        </div>
      </div>
    </Link>
  );
};

export default BlogCard;
