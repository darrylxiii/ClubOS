import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, Users } from 'lucide-react';
import { BlogPost, getCategoryBySlug } from '@/data/blog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BlogFeaturedProps {
  post: BlogPost;
}

const BlogFeatured: React.FC<BlogFeaturedProps> = ({ post }) => {
  const category = getCategoryBySlug(post.category);

  return (
    <motion.section 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mb-12 md:mb-20"
    >
      <Link to={`/blog/${post.category}/${post.slug}`} className="group block relative rounded-3xl overflow-hidden">
        <div className="relative aspect-[16/10] md:aspect-[21/9] overflow-hidden">
          <img src={post.heroImage.url} alt={post.heroImage.alt}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </div>

        <div className="absolute inset-0 flex items-end p-6 md:p-10 lg:p-14">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={cn("max-w-2xl backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]")}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-accent/90 text-accent-foreground">
                Featured
              </span>
              {category && (
                <span className="text-xs font-medium text-white/70 uppercase tracking-wider">{category.name}</span>
              )}
            </div>

            <h2 className="font-sans text-2xl md:text-3xl lg:text-4xl font-semibold text-white mb-4 leading-tight group-hover:text-accent transition-colors duration-300">
              {post.title}
            </h2>
            <p className="text-white/80 text-base md:text-lg mb-6 line-clamp-2 leading-relaxed">{post.excerpt}</p>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/30">
                  <img src={post.author.avatar || '/placeholder.svg'} alt={post.author.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{post.author.name}</p>
                  <div className="flex items-center gap-3 text-white/60 text-xs">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime} min read</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{post.socialProofCount.toLocaleString()} readers</span>
                  </div>
                </div>
              </div>
              <Button variant="secondary" className="rounded-full px-5 h-10 bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-all duration-300 group-hover:scale-105">
                Read Article <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </motion.div>
        </div>
      </Link>
    </motion.section>
  );
};

export default BlogFeatured;
