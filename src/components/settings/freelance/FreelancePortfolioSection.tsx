import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Briefcase, Plus, Trash2, ExternalLink, Loader2, Image, Link } from "lucide-react";
import { toast } from "sonner";

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  image_url?: string;
  tags?: string[];
}

interface FreelancePortfolioSectionProps {
  userId: string;
  freelanceProfile: any;
  onUpdate: () => void;
}

export function FreelancePortfolioSection({ userId, freelanceProfile, onUpdate }: FreelancePortfolioSectionProps) {
  const [saving, setSaving] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (freelanceProfile?.portfolio_items) {
      setPortfolioItems(freelanceProfile.portfolio_items as PortfolioItem[]);
    }
  }, [freelanceProfile]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setUrl("");
    setImageUrl("");
    setTags("");
    setEditingItem(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: PortfolioItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description);
    setUrl(item.url || "");
    setImageUrl(item.image_url || "");
    setTags(item.tags?.join(", ") || "");
    setIsDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const newItem: PortfolioItem = {
        id: editingItem?.id || crypto.randomUUID(),
        title: title.trim(),
        description: description.trim(),
        url: url.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      };

      let updatedItems: PortfolioItem[];
      if (editingItem) {
        updatedItems = portfolioItems.map(item => 
          item.id === editingItem.id ? newItem : item
        );
      } else {
        updatedItems = [...portfolioItems, newItem];
      }

      const { error } = await supabase
        .from("freelance_profiles")
        .upsert({
          id: userId,
          portfolio_items: updatedItems as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;

      setPortfolioItems(updatedItems);
      setIsDialogOpen(false);
      resetForm();
      toast.success(editingItem ? "Portfolio item updated" : "Portfolio item added");
      onUpdate();
    } catch (error: any) {
      console.error("Error saving portfolio item:", error);
      toast.error("Failed to save portfolio item");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setSaving(true);
    try {
      const updatedItems = portfolioItems.filter(item => item.id !== itemId);

      const { error } = await supabase
        .from("freelance_profiles")
        .upsert({
          id: userId,
          portfolio_items: updatedItems as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;

      setPortfolioItems(updatedItems);
      toast.success("Portfolio item deleted");
      onUpdate();
    } catch (error: any) {
      console.error("Error deleting portfolio item:", error);
      toast.error("Failed to delete portfolio item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Portfolio
            </CardTitle>
            <CardDescription>
              Showcase your best work to attract clients
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit Portfolio Item" : "Add Portfolio Item"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Project name"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your work..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url" className="flex items-center gap-1">
                    <Link className="h-3 w-3" />
                    Project URL
                  </Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image" className="flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    Image URL
                  </Label>
                  <Input
                    id="image"
                    type="url"
                    placeholder="https://... (screenshot or preview)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder="React, TypeScript, Design"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveItem} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {portfolioItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No portfolio items yet</p>
            <p className="text-sm">Add your best work to attract more clients</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolioItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors group"
              >
                {item.image_url && (
                  <div className="aspect-video rounded-md overflow-hidden mb-3 bg-muted">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.title}</h4>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 rounded-full bg-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(item.url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(item)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
