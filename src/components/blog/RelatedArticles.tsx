import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BlogPost } from '@/data/blog';
import BlogCard from './BlogCard';

interface RelatedArticlesProps { posts: BlogPost[]; title?: string; }

const RelatedArticles: React.FC<RelatedArticlesProps> = ({ posts, title = "Related Articles" }) => {
  if (posts.length === 0) return null;
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">{title}</h2>
          <Link to="/blog" className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            View all articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.slice(0, 3).map(p => <BlogCard key={p.id} post={p} />)}
        </div>
      </div>
    </section>
  );
};

export default RelatedArticles;
