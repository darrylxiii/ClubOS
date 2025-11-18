import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, TrendingUp, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Breadcrumb } from "@/components/Breadcrumb";

const categories = [
  { value: 'getting_started', label: 'Getting Started', icon: '🚀' },
  { value: 'candidates', label: 'For Candidates', icon: '👤' },
  { value: 'partners', label: 'For Partners', icon: '🤝' },
  { value: 'billing', label: 'Billing', icon: '💳' },
  { value: 'integrations', label: 'Integrations', icon: '🔗' },
  { value: 'troubleshooting', label: 'Troubleshooting', icon: '🔧' },
];

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: featuredArticles } = useQuery({
    queryKey: ['kb-featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select('*')
        .eq('status', 'published')
        .eq('featured', true)
        .order('view_count', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  const { data: popularArticles } = useQuery({
    queryKey: ['kb-popular'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select('*')
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const { data: categoryArticles } = useQuery({
    queryKey: ['kb-category', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return null;

      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select('*')
        .eq('status', 'published')
        .eq('category', selectedCategory)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategory,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['kb-search-results', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return null;

      const { data, error } = await supabase.functions.invoke('kb-search', {
        body: { query: searchQuery },
      });

      if (error) throw error;
      return data.results;
    },
    enabled: searchQuery.length >= 2,
  });

  const displayArticles = searchResults || categoryArticles || featuredArticles;

  return (
    <AppLayout>
      <div className="container max-w-7xl py-8">
        <Breadcrumb items={[
          { label: 'Home', path: '/home' },
          { label: 'Knowledge Base' }
        ]} />
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Knowledge Base</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Find answers and learn about The Quantum Club platform
        </p>

        {/* Search */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            className="pl-12 h-14 text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      {!searchQuery && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {categories.map((cat) => (
            <Card
              key={cat.value}
              className={`p-4 text-center cursor-pointer hover:shadow-md transition-shadow ${
                selectedCategory === cat.value ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
            >
              <div className="text-3xl mb-2">{cat.icon}</div>
              <p className="text-sm font-medium">{cat.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Popular Articles Sidebar */}
      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {searchQuery ? `Search Results for "${searchQuery}"` :
               selectedCategory ? categories.find(c => c.value === selectedCategory)?.label :
               'Featured Articles'}
            </h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm text-primary hover:underline"
              >
                View All
              </button>
            )}
          </div>

          {/* Articles Grid */}
          {displayArticles && displayArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {displayArticles.map((article: any) => (
                <Card
                  key={article.id}
                  className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/help/${article.slug}`)}
                >
                  {article.featured && (
                    <Badge className="mb-3" variant="secondary">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{article.view_count} views</span>
                    {article.helpful_count > 0 && (
                      <span>👍 {article.helpful_count}</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              No articles found
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Popular Articles</h3>
            </div>
            <div className="space-y-3">
              {popularArticles?.map((article, index) => (
                <button
                  key={article.id}
                  onClick={() => navigate(`/help/${article.slug}`)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-2">{article.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {article.view_count} views
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
