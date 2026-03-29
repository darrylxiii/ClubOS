import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from '@/lib/motion';
import { Clock } from 'lucide-react';
import { BlogPost, getCategoryBySlug } from '@/data/blog';

interface BlogFeaturedProps {
  post: BlogPost;
}

const BlogFeatured: React.FC<BlogFeaturedProps> = ({ post }) => {
  const { t } = useTranslation('common');
  const category = getCategoryBySlug(post.category);

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="mb-16 md:mb-20"
    >
      <Link to={`/blog/${post.category}/${post.slug}`} className="group block relative rounded-2xl overflow-hidden">
        <div className="relative aspect-[16/10] md:aspect-[21/9] overflow-hidden">
          <img
            src={post.heroImage.url}
            alt={post.heroImage.alt}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>

        <div className="absolute inset-0 flex items-end p-6 md:p-10 lg:p-14">
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="max-w-2xl"
          >
            {category && (
              <span className="inline-block text-[11px] font-medium uppercase tracking-widest text-white/60 mb-3">
                {category.name}
              </span>
            )}

            <h2 className="font-semibold text-2xl md:text-3xl lg:text-4xl text-white mb-3 leading-tight">
              {post.title}
            </h2>

            <p className="text-white/70 text-base md:text-lg mb-5 line-clamp-2 leading-relaxed">
              {post.excerpt}
            </p>

            <div className="flex items-center gap-3 text-white/50 text-sm">
              <span className="font-medium text-white/70">{post.author.name}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {t('blog.minRead', { minutes: post.readTime })}
              </span>
            </div>
          </motion.div>
        </div>
      </Link>
    </motion.section>
  );
};

export default BlogFeatured;
