import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { blogPosts as staticPosts, BlogPost, Author, ContentBlock, authors } from '@/data/blog';

interface DBBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  content: unknown;
  hero_image: unknown;
  author_id: string | null;
  keywords: string[] | null;
  key_takeaways: string[] | null;
  related_products: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  ai_generated: boolean | null;
  performance_score: number | null;
}

// Default author for AI-generated content
const defaultAuthor: Author = authors[0]; // TQC Editorial

// Calculate read time from word count (~200 WPM)
const calculateReadTime = (content: ContentBlock[] | null): number => {
  if (!content || content.length === 0) return 5;
  let wordCount = 0;
  for (const block of content) {
    if ('content' in block && typeof (block as any).content === 'string') {
      wordCount += (block as any).content.split(/\s+/).filter(Boolean).length;
    }
    if ('text' in block && typeof (block as any).text === 'string') {
      wordCount += (block as any).text.split(/\s+/).filter(Boolean).length;
    }
  }
  return Math.max(1, Math.ceil(wordCount / 200));
};

// Transform database post to BlogPost format
const transformDBPost = (dbPost: DBBlogPost): BlogPost => {
  const heroImage = dbPost.hero_image as { url?: string; alt?: string; caption?: string } | null;
  const content = dbPost.content as ContentBlock[] | null;
  
  // Find author or use default
  const author = authors.find((a) => a.id === dbPost.author_id) || defaultAuthor;
  
  return {
    id: dbPost.id,
    slug: dbPost.slug,
    title: dbPost.title,
    excerpt: dbPost.excerpt || '',
    category: dbPost.category,
    author,
    publishedAt: dbPost.published_at || dbPost.created_at,
    updatedAt: dbPost.updated_at,
    readTime: calculateReadTime(content),
    featured: false,
    heroImage: {
      url: heroImage?.url || '/placeholder.svg',
      alt: heroImage?.alt || dbPost.title,
      caption: heroImage?.caption,
    },
    content: content || [],
    keyTakeaways: dbPost.key_takeaways || [],
    metaTitle: dbPost.meta_title || dbPost.title,
    metaDescription: dbPost.meta_description || dbPost.excerpt || '',
    keywords: dbPost.keywords || [],
    faqSchema: (dbPost as any).faq_schema || [],
    ai_generated: dbPost.ai_generated || false,
    relatedProducts: dbPost.related_products || [],
    socialProofCount: 0,
    relatedArticles: [],
  };
};

export const useDynamicBlogPosts = () => {
  return useQuery({
    queryKey: ['blog-posts', 'published'],
    queryFn: async (): Promise<BlogPost[]> => {
      // Fetch published posts from database
      const { data: dbPosts, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching blog posts:', error);
        // Fall back to static posts on error
        return staticPosts;
      }

      // Transform database posts
      const dynamicPosts = (dbPosts || []).map(transformDBPost);

      // Merge with static posts, avoiding duplicates by slug
      const dynamicSlugs = new Set(dynamicPosts.map((p) => p.slug));
      const uniqueStaticPosts = staticPosts.filter((p) => !dynamicSlugs.has(p.slug));

      // Return merged and sorted by date
      const allPosts = [...dynamicPosts, ...uniqueStaticPosts].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      return allPosts;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Hook to get a single post by slug
export const useDynamicBlogPost = (categorySlug: string, postSlug: string) => {
  return useQuery({
    queryKey: ['blog-post', categorySlug, postSlug],
    queryFn: async (): Promise<BlogPost | null> => {
      // First try to find in database
      const { data: dbPost, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', postSlug)
        .eq('category', categorySlug)
        .eq('status', 'published')
        .maybeSingle();

      if (dbPost && !error) {
        return transformDBPost(dbPost);
      }

      // Fall back to static posts
      const staticPost = staticPosts.find(
        (p) => p.slug === postSlug && p.category === categorySlug
      );

      return staticPost || null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to get posts by category
export const useDynamicBlogPostsByCategory = (categorySlug: string) => {
  const { data: allPosts, ...rest } = useDynamicBlogPosts();

  const categoryPosts = allPosts?.filter((post) => post.category === categorySlug) || [];

  return {
    data: categoryPosts,
    ...rest,
  };
};

// Hook for search
export const useSearchBlogPosts = (query: string) => {
  const { data: allPosts, ...rest } = useDynamicBlogPosts();

  const searchResults = allPosts?.filter((post) => {
    const lowerQuery = query.toLowerCase();
    return (
      post.title.toLowerCase().includes(lowerQuery) ||
      post.excerpt.toLowerCase().includes(lowerQuery) ||
      post.keyTakeaways.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }) || [];

  return {
    data: searchResults,
    ...rest,
  };
};

// Get featured post (most recent or highest performance score)
export const useFeaturedBlogPost = () => {
  const { data: allPosts, ...rest } = useDynamicBlogPosts();

  const featured = allPosts?.find((p) => p.featured) || allPosts?.[0] || null;

  return {
    data: featured,
    ...rest,
  };
};
