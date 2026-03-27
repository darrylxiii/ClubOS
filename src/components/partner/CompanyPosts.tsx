import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from 'react-i18next';

interface CompanyPostsProps {
  companyId: string;
}

export const CompanyPosts = ({ companyId }: CompanyPostsProps) => {
  const { t } = useTranslation('partner');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    post_type: 'news' as const,
    is_public: true,
    is_featured: false,
    tags: '',
  });

  useEffect(() => {
    fetchPosts();
  }, [companyId]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('company_posts')
        .select(`
          *,
          profiles:author_id(full_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error(t('companyPosts.toast.failedToLoadPosts'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const postData = {
        company_id: companyId,
        author_id: (await supabase.auth.getUser()).data.user?.id,
        title: formData.title,
        content: formData.content,
        post_type: formData.post_type,
        is_public: formData.is_public,
        is_featured: formData.is_featured,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        published_at: new Date().toISOString(),
      };

      if (editingPost) {
        const { error } = await supabase
          .from('company_posts')
          .update(postData)
          .eq('id', editingPost.id);

        if (error) throw error;
        toast.success(t('companyPosts.toast.postUpdatedSuccessfully'));
      } else {
        const { error } = await supabase
          .from('company_posts')
          .insert([postData]);

        if (error) throw error;
        toast.success(t('companyPosts.toast.postCreatedSuccessfully'));
      }

      setDialogOpen(false);
      setEditingPost(null);
      setFormData({
        title: '',
        content: '',
        post_type: 'news',
        is_public: true,
        is_featured: false,
        tags: '',
      });
      fetchPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error(t('companyPosts.toast.failedToSavePost'));
    }
  };

  const handleEdit = (post: any) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      post_type: post.post_type,
      is_public: post.is_public,
      is_featured: post.is_featured,
      tags: post.tags?.join(', ') || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const { error } = await supabase
        .from('company_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      toast.success(t('companyPosts.toast.postDeletedSuccessfully'));
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(t('companyPosts.toast.failedToDeletePost'));
    }
  };

  const getPostTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      news: 'bg-blue-500',
      milestone: 'bg-green-500',
      event: 'bg-purple-500',
      update: 'bg-yellow-500',
      media: 'bg-pink-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase">{t('companyPosts.companyPosts')}</h2>
          <p className="text-sm text-muted-foreground">{t('companyPosts.manageYourCompanyNewsAndUpdates')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPost(null);
              setFormData({
                title: '',
                content: '',
                post_type: 'news',
                is_public: true,
                is_featured: false,
                tags: '',
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
              <DialogDescription>{t('companyPosts.dialogDescription')}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('companyPosts.label.title')}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">{t('companyPosts.label.content')}</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="post_type">{t('companyPosts.label.postType')}</Label>
                  <Select
                    value={formData.post_type}
                    onValueChange={(value: any) => setFormData({ ...formData, post_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="news">{t('companyPosts.option.news')}</SelectItem>
                      <SelectItem value="milestone">{t('companyPosts.option.milestone')}</SelectItem>
                      <SelectItem value="event">{t('companyPosts.option.event')}</SelectItem>
                      <SelectItem value="update">{t('common:update')}</SelectItem>
                      <SelectItem value="media">{t('companyPosts.option.media')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">{t('companyPosts.label.tagsCommaSeparated')}</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g. product, hiring, culture"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t('companyPosts.public')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{t('companyPosts.featured')}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common:cancel')}
                </Button>
                <Button type="submit">
                  {editingPost ? 'Update' : 'Create'} Post
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('companyPosts.noPostsYetCreateYourFirstPostToGetStarte')}</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="border-2 border-foreground">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getPostTypeColor(post.post_type)}>
                        {post.post_type}
                      </Badge>
                      {post.is_featured && (
                        <Badge variant="secondary">{t('companyPosts.badge.featured')}</Badge>
                      )}
                      {!post.is_public && (
                        <Badge variant="outline">{t('companyPosts.badge.private')}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(post.published_at), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.view_count} views
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(post)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-3">{post.content}</p>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};