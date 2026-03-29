import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BlogPost } from '@/data/blog';
import TableOfContents from './TableOfContents';
import { cn } from '@/lib/utils';

interface ArticleSidebarProps {
  post: BlogPost;
  popularPosts: BlogPost[];
  className?: string;
}

const ArticleSidebar: React.FC<ArticleSidebarProps> = ({ post, popularPosts, className }) => {
  const { t } = useTranslation('common');
  return (
    <aside className={cn("hidden lg:block w-80 flex-shrink-0", className)}>
      <div className="sticky top-28 space-y-8">
        <div className="bg-card border border-border rounded-2xl p-5">
          <TableOfContents content={post.content} variant="desktop" />
        </div>

        {/* Combined CTA */}
        <div className="border border-border rounded-2xl p-5">
          <p className="text-xs tracking-widest uppercase text-muted-foreground mb-2">{t('blog.joinTheQuantumClub')}</p>
          <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
            {t('blog.privateNetworkDescription')}
          </p>
          <div className="flex flex-col gap-2">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/70 transition-colors"
            >
              {t('blog.applyAsTalent')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/partnerships"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('blog.partnerWithUs')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {popularPosts.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-foreground mb-4">{t('blog.popularArticles')}</h4>
            <ul className="space-y-4">
              {popularPosts.slice(0, 3).map((article) => (
                <li key={article.id}>
                  <Link to={`/blog/${article.category}/${article.slug}`} className="group block">
                    <p className="text-sm text-foreground group-hover:text-foreground/70 transition-colors line-clamp-2 font-medium">{article.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('blog.minRead', { minutes: article.readTime })}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ArticleSidebar;
