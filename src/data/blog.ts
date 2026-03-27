// Blog Data Architecture for The Quantum Club
// Centralized content store with E-E-A-T compliance and AEO optimization

export interface Author {
  id: string;
  name: string;
  credentials: string;
  avatar: string;
  bio: string;
  specialties: string[];
  publications: number;
  medicallyVerified: boolean; // Renamed to "Expert Verified" in UI
  licenseNumber?: string;
  institution?: string;
}

export interface BlogCategory {
  slug: string;
  name: string;
  description: string;
  icon: 'Briefcase' | 'Target' | 'LineChart' | 'Zap';
  color: string;
}

export interface ContentBlock {
  type: 'paragraph' | 'heading' | 'image' | 'quote' | 'list' | 'callout';
  content: string;
  level?: 2 | 3 | 4; // For headings
  items?: string[]; // For lists
  imageUrl?: string;
  imageAlt?: string;
  caption?: string;
  productId?: string; // For callouts (maps to role or platform feature)
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: Author;
  reviewedBy?: Author;
  publishedAt: string;
  updatedAt: string;
  readTime: number;
  featured: boolean;
  
  // AEO Summary Box (AI Search Optimization)
  keyTakeaways: string[];
  
  // Content
  heroImage: {
    url: string;
    alt: string;
    caption?: string;
  };
  content: ContentBlock[];
  
  // SEO
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  faqSchema?: Array<{ question: string; answer: string }>;
  
  // Schema.org data
  medicalSpecialty?: string; // Can map to "Executive Search" or similar
  
  // AI content flag
  ai_generated?: boolean;
  
  // Conversion
  relatedProducts: string[];
  socialProofCount: number;
  
  // Related articles
  relatedArticles?: string[];
}

// Authors (E-E-A-T Critical)
export const authors: Author[] = [
  {
    id: 'tqc-editorial',
    name: 'TQC Editorial',
    credentials: 'Talent Strategy Team',
    avatar: '/quantum-logo.svg',
    bio: 'Insights from The Quantum Club\'s elite talent strategists and executive search partners.',
    specialties: ['Executive Search', 'Talent Intelligence', 'Market Analysis'],
    publications: 124,
    medicallyVerified: true,
    institution: 'The Quantum Club',
  },
  {
    id: 'alex-mercer',
    name: 'Alex Mercer',
    credentials: 'Chief Strategy Officer',
    avatar: '/placeholder.svg',
    bio: 'Former global head of talent at Fortune 100 tech firms. Specialist in executive compensation and retention.',
    specialties: ['Compensation Strategy', 'C-Suite Hiring', 'Organizational Design'],
    publications: 32,
    medicallyVerified: true,
    institution: 'The Quantum Club',
  },
  {
    id: 'sarah-jenkins',
    name: 'Sarah Jenkins',
    credentials: 'VP of Member Success',
    avatar: '/placeholder.svg',
    bio: 'Expert in candidate experience and career acceleration for top 1% talent.',
    specialties: ['Career Coaching', 'Personal Branding', 'Negotiation'],
    publications: 18,
    medicallyVerified: false,
  },
];

// Categories
export const categories: BlogCategory[] = [
  {
    slug: 'career-insights',
    name: 'Career Insights',
    description: 'Strategic advice for navigating the upper echelons of the tech and executive job market.',
    icon: 'Briefcase',
    color: 'hsl(var(--accent))',
  },
  {
    slug: 'talent-strategy',
    name: 'Talent Strategy',
    description: 'Deep dives into hiring methodologies, team building, and organizational performance.',
    icon: 'Target',
    color: 'hsl(var(--primary))',
  },
  {
    slug: 'industry-trends',
    name: 'Industry Trends',
    description: 'Data-backed analysis of market shifts, compensation benchmarks, and emerging roles.',
    icon: 'LineChart',
    color: 'hsl(var(--primary))',
  },
  {
    slug: 'leadership',
    name: 'Leadership',
    description: 'Executive playbooks for driving high-performance cultures and innovation.',
    icon: 'Zap',
    color: 'hsl(var(--accent))',
  },
];

// Blog Posts (Seed Data)
export const blogPosts: BlogPost[] = [
  {
    id: 'onboarding-speed',
    slug: 'why-speed-to-hire-matters',
    title: 'The 5-Minute Onboarding: Why Speed is the New Currency in Executive Hiring',
    excerpt: 'Top talent is off the market in 10 days. Discover how friction-free onboarding processes secure the best candidates.',
    category: 'talent-strategy',
    author: authors[0],
    reviewedBy: authors[1],
    publishedAt: '2024-02-15',
    updatedAt: '2024-02-20',
    readTime: 6,
    featured: true,
    keyTakeaways: [
      'Reduce time-to-shortlist by 60% with automated profile parsing',
      'Eliminate repetitive data entry to improve candidate NPS',
      'Smart calendar integration speeds up interview scheduling by 3x',
    ],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80',
      alt: 'Executive checking time on watch in modern office',
      caption: 'Speed and precision define modern executive search',
    },
    content: [
      {
        type: 'paragraph',
        content: 'In the hyper-competitive landscape of executive search, time is not just money—it is talent. The most desirable candidates are often passive, busy, and intolerant of friction. If your hiring process involves lengthy forms and slow feedback loops, you are already losing.',
      },
      {
        type: 'heading',
        content: 'The Cost of Friction',
        level: 2,
      },
      {
        type: 'paragraph',
        content: 'Traditional application processes asking for resume uploads followed by manual entry of the same data see drop-off rates as high as 60%. For C-suite roles, this is unacceptable. High-performers value efficiency above all else.',
      },
      {
        type: 'callout',
        content: 'Pro Tip: Use The Quantum Club\'s "Club Sync" to auto-populate profiles from LinkedIn or CVs in seconds.',
        productId: 'platform-onboarding',
      },
      {
        type: 'heading',
        content: 'Streamlining the Pipeline',
        level: 2,
      },
      {
        type: 'list',
        content: 'Key elements of a friction-free process:',
        items: [
          'Single-click data import (SSO/LinkedIn)',
          'Automated scheduling via calendar integration',
          'Transparent feedback timelines',
          'Mobile-first experience for on-the-go executives',
        ],
      },
      {
        type: 'quote',
        content: 'The best candidates don\'t apply to jobs; they evaluate opportunities. Respect their time, and you win their attention.',
        caption: '— Alex Mercer, Chief Strategy Officer',
      },
    ],
    metaTitle: 'Why Speed Matters in Executive Hiring | The Quantum Club',
    metaDescription: 'Learn how reducing friction and improving speed-to-hire can help you secure top 1% talent before competitors do.',
    keywords: ['executive hiring', 'time to hire', 'recruitment efficiency', 'talent acquisition'],
    relatedProducts: ['platform-onboarding'],
    socialProofCount: 1240,
    relatedArticles: ['data-driven-hiring', 'negotiation-tactics'],
  },
  {
    id: 'data-driven-hiring',
    slug: 'data-driven-hiring-decisions',
    title: 'Beyond the Gut Feeling: Making Data-Driven Hiring Decisions',
    excerpt: 'How AI and analytics are replacing intuition in selecting high-impact leadership.',
    category: 'industry-trends',
    author: authors[1],
    publishedAt: '2024-02-10',
    updatedAt: '2024-02-12',
    readTime: 8,
    featured: false,
    keyTakeaways: [
      'AI matching reduces bias and uncovers hidden potential',
      'Quantitative skills assessment predicts performance better than pedigree',
      'Cultural fit can be measured through verified value alignment',
    ],
    heroImage: {
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80',
      alt: 'Data visualization on tablet screen',
    },
    content: [
      {
        type: 'paragraph',
        content: 'For decades, "culture fit" was a euphemism for "someone I\'d like to have a beer with." Today, that approach is a liability. Data-driven hiring uses objective metrics to predict success, ensuring that every hire is a strategic asset.',
      },
      {
        type: 'heading',
        content: 'The Role of AI in Selection',
        level: 2,
      },
      {
        type: 'paragraph',
        content: 'AI doesn\'t replace human judgment; it augments it. By analyzing thousands of data points—from skills overlap to communication style—AI can highlight candidates who might be overlooked by traditional screening but possess the exact capabilities needed for the role.',
      },
      {
        type: 'callout',
        content: 'QUIN utilizes advanced embeddings to match candidate profiles with role requirements beyond just keywords.',
        productId: 'quin-ai',
      },
    ],
    metaTitle: 'Data-Driven Hiring: The Future of Recruitment | The Quantum Club',
    metaDescription: 'Move beyond intuition. Discover how data and AI are transforming executive search and improving hiring outcomes.',
    keywords: ['data driven hiring', 'AI recruitment', 'hiring analytics', 'executive search'],
    relatedProducts: ['quin-ai'],
    socialProofCount: 890,
    relatedArticles: ['onboarding-speed'],
  },
];

// Helper functions (mirrored from original)
export const getPostBySlug = (slug: string): BlogPost | undefined => {
  return blogPosts.find((post) => post.slug === slug);
};

export const getCategoryBySlug = (slug: string): BlogCategory | undefined => {
  return categories.find((cat) => cat.slug === slug);
};

export const getPostsByCategory = (categorySlug: string): BlogPost[] => {
  return blogPosts.filter((post) => post.category === categorySlug);
};

export const getRelatedPosts = (currentPostId: string, limit: number = 3): BlogPost[] => {
  return blogPosts
    .filter((post) => post.id !== currentPostId)
    .slice(0, limit);
};
