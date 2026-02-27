import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Loader2,
  Trash2,
  Eye,
  Send,
  Calendar,
  Archive,
  ImagePlus,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'archived', label: 'Archived' },
];

const BlogArticleManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [schedulePostId, setSchedulePostId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-blog-posts', statusFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select('id, slug, title, category, status, ai_generated, performance_score, created_at, published_at, hero_image, content_format')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, published_at }: { id: string; status: string; published_at?: string }) => {
      const updates: any = { status };
      if (published_at) updates.published_at = published_at;
      if (status === 'published' && !published_at) updates.published_at = new Date().toISOString();

      const { error } = await supabase.from('blog_posts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Article updated');
    },
    onError: () => toast.error('Failed to update article'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      toast.success('Article deleted');
    },
    onError: () => toast.error('Failed to delete article'),
  });

  const handleGenerateImage = async (postId: string, title: string) => {
    setGeneratingImageFor(postId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ postId, prompt: title }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success('Hero image generated');
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
    } catch (error) {
      toast.error('Image generation failed');
    } finally {
      setGeneratingImageFor(null);
    }
  };

  const handleSchedule = () => {
    if (!schedulePostId || !scheduleDate) return;
    updateStatusMutation.mutate({ id: schedulePostId, status: 'scheduled', published_at: new Date(scheduleDate).toISOString() });
    setScheduleDialogOpen(false);
    setSchedulePostId(null);
    setScheduleDate('');
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-amber-500/10 text-amber-500',
      published: 'bg-emerald-500/10 text-emerald-500',
      scheduled: 'bg-blue-500/10 text-blue-500',
      archived: 'bg-muted text-muted-foreground',
    };
    return <Badge className={colors[status] || ''}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Articles List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Articles ({posts?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !posts?.length ? (
            <p className="text-muted-foreground text-center py-8">No articles found.</p>
          ) : (
            <div className="space-y-2">
              {posts.map((post: any) => (
                <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                    {post.hero_image?.url && post.hero_image.url !== '/placeholder.svg' ? (
                      <img src={post.hero_image.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{post.title}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{post.category}</Badge>
                      {post.ai_generated && <Badge variant="outline" className="text-xs">AI</Badge>}
                      {post.performance_score > 0 && (
                        <Badge variant="outline" className="text-xs">Score: {post.performance_score}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Status + Date */}
                  <div className="text-right flex-shrink-0">
                    {statusBadge(post.status)}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(post.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleGenerateImage(post.id, post.title)}
                      disabled={generatingImageFor === post.id}
                    >
                      {generatingImageFor === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    </Button>
                    {post.status === 'draft' && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => updateStatusMutation.mutate({ id: post.id, status: 'published' })}>
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSchedulePostId(post.id);
                            setScheduleDialogOpen(true);
                          }}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {post.status === 'published' && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatusMutation.mutate({ id: post.id, status: 'archived' })}>
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(post.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Article</DialogTitle>
            <DialogDescription>Choose when to publish this article.</DialogDescription>
          </DialogHeader>
          <Input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={!scheduleDate}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogArticleManager;
