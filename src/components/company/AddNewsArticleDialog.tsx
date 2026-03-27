import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, X, Link2 } from 'lucide-react';
import { isValidUrl } from '@/lib/linkPreviewUtils';

interface AddNewsArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess?: () => void;
}

export function AddNewsArticleDialog({ open, onOpenChange, companyId, onSuccess }: AddNewsArticleDialogProps) {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [publishedDate, setPublishedDate] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidUrl(url)) {
      toast.error(t("please_enter_a_valid", "Please enter a valid URL"));
      return;
    }

    if (!title.trim()) {
      toast.error(t("title_is_required", "Title is required"));
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check pinned count if trying to pin
      if (isPinned) {
        const { count } = await supabase
          .from('company_news_articles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('is_pinned', true);

        if (count && count >= 3) {
          toast.error(t("maximum_3_pinned_articles", "Maximum 3 pinned articles allowed"));
          setIsPinned(false);
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('company_news_articles')
        .insert({
          company_id: companyId,
          added_by: user.id,
          url: url.trim(),
          title: title.trim(),
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
          published_date: publishedDate || null,
          source_name: sourceName.trim() || null,
          author: author.trim() || null,
          tags: tags.length > 0 ? tags : null,
          is_featured: isFeatured,
          is_pinned: isPinned,
        });

      if (error) throw error;

      toast.success(t("news_article_added_successfully", "News article added successfully"));
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error adding news article:', error);
      toast.error(t("failed_to_add_news", "Failed to add news article"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUrl('');
    setTitle('');
    setDescription('');
    setImageUrl('');
    setPublishedDate('');
    setSourceName('');
    setAuthor('');
    setTags([]);
    setTagInput('');
    setIsFeatured(false);
    setIsPinned(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Add News Article
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL */}
          <div className="space-y-2">
            <Label htmlFor="url">{t("article_url", "Article URL *")}</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("title", "Title *")}</Label>
            <Input
              id="title"
              placeholder={t("article_headline", "Article headline")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("description", "Description")}</Label>
            <Textarea
              id="description"
              placeholder={t("brief_summary_of_the", "Brief summary of the article")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/200 characters
            </p>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">{t("image_url", "Image URL")}</Label>
            <Input
              id="imageUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Source Name */}
            <div className="space-y-2">
              <Label htmlFor="sourceName">{t("source", "Source")}</Label>
              <Input
                id="sourceName"
                placeholder={t("techcrunch_bloomberg_etc", "TechCrunch, Bloomberg, etc.")}
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
            </div>

            {/* Published Date */}
            <div className="space-y-2">
              <Label htmlFor="publishedDate">{t("published_date", "Published Date")}</Label>
              <Input
                id="publishedDate"
                type="date"
                value={publishedDate}
                onChange={(e) => setPublishedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="author">{t("author", "Author")}</Label>
            <Input
              id="author"
              placeholder={t("author_name", "Author name")}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">{t("tags", "Tags")}</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder={t("add_a_tag", "Add a tag")}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Featured & Pinned */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="featured">{t("featured_article", "Featured Article")}</Label>
                <p className="text-xs text-muted-foreground">
                  Highlight this article with a special badge
                </p>
              </div>
              <Switch
                id="featured"
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pinned">{t("pin_article", "Pin Article")}</Label>
                <p className="text-xs text-muted-foreground">
                  Keep at top of feed (max 3)
                </p>
              </div>
              <Switch
                id="pinned"
                checked={isPinned}
                onCheckedChange={setIsPinned}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Article
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
