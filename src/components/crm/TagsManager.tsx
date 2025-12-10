import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tags, Plus, X, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  color: string;
  count?: number;
}

const TAG_COLORS = [
  { name: 'Red', value: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { name: 'Orange', value: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { name: 'Yellow', value: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { name: 'Green', value: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { name: 'Blue', value: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { name: 'Purple', value: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { name: 'Pink', value: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
];

interface TagsManagerProps {
  tags: Tag[];
  selectedTags?: string[];
  onTagSelect?: (tagId: string) => void;
  onCreateTag?: (name: string, color: string) => void;
  onDeleteTag?: (tagId: string) => void;
  mode?: 'manage' | 'select';
}

export function TagsManager({
  tags,
  selectedTags = [],
  onTagSelect,
  onCreateTag,
  onDeleteTag,
  mode = 'manage',
}: TagsManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[4].value);

  const handleCreate = () => {
    if (newTagName.trim() && onCreateTag) {
      onCreateTag(newTagName.trim(), selectedColor);
      setNewTagName('');
      setShowCreate(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tags className="w-5 h-5" />
            Tags
          </CardTitle>
          {mode === 'manage' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreate(!showCreate)}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Tag
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Create new tag */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pb-3 border-b border-border/30"
            >
              <Input
                placeholder="Tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="bg-muted/20"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform",
                      color.value.split(' ')[0],
                      selectedColor === color.value ? "scale-125 ring-2 ring-primary" : "hover:scale-110"
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} disabled={!newTagName.trim()}>
                  <Check className="w-4 h-4 mr-1" />
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tags list */}
        <div className="flex flex-wrap gap-2">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags created yet</p>
          ) : (
            tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "cursor-pointer transition-all pr-6",
                      tag.color,
                      isSelected && "ring-2 ring-primary"
                    )}
                    onClick={() => onTagSelect?.(tag.id)}
                  >
                    {tag.name}
                    {tag.count !== undefined && (
                      <span className="ml-1 opacity-60">({tag.count})</span>
                    )}
                  </Badge>
                  {mode === 'manage' && onDeleteTag && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTag(tag.id);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
