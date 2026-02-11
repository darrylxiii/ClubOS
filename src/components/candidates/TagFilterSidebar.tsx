import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tags, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TagDefinition {
  id: string;
  name: string;
  category: string;
  color: string;
}

interface TagFilterSidebarProps {
  selectedTagIds: string[];
  onTagSelectionChange: (tagIds: string[]) => void;
  className?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  quality: 'Quality',
  seniority: 'Seniority',
  function: 'Function',
  industry: 'Industry',
  availability: 'Availability',
  source: 'Source',
  custom: 'Custom',
};

const CATEGORY_ORDER = ['quality', 'seniority', 'function', 'industry', 'availability', 'source', 'custom'];

export function TagFilterSidebar({ selectedTagIds, onTagSelectionChange, className }: TagFilterSidebarProps) {
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, TagDefinition[]>>({});
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));

  useEffect(() => {
    const loadTags = async () => {
      const { data, error } = await (supabase as any)
        .from('candidate_tag_definitions')
        .select('id, name, category, color')
        .order('category')
        .order('name');
      if (!error && data) {
        const grouped = (data as TagDefinition[]).reduce<Record<string, TagDefinition[]>>((acc, tag) => {
          if (!acc[tag.category]) acc[tag.category] = [];
          acc[tag.category].push(tag);
          return acc;
        }, {});
        setTagsByCategory(grouped);
      }
    };
    loadTags();
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagSelectionChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagSelectionChange([...selectedTagIds, tagId]);
    }
  }, [selectedTagIds, onTagSelectionChange]);

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const categories = CATEGORY_ORDER.filter(cat => tagsByCategory[cat]?.length);

  if (categories.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Tags className="w-4 h-4" />
          Filter by Tags
        </h3>
        {selectedTagIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground"
            onClick={() => onTagSelectionChange([])}
          >
            Clear all
          </Button>
        )}
      </div>

      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-1 pb-2 border-b border-border/30">
          {selectedTagIds.map(id => {
            const tag = Object.values(tagsByCategory).flat().find(t => t.id === id);
            if (!tag) return null;
            return (
              <Badge
                key={id}
                variant="outline"
                className="cursor-pointer text-xs pr-1"
                style={{ borderColor: tag.color + '60', color: tag.color, backgroundColor: tag.color + '15' }}
                onClick={() => toggleTag(id)}
              >
                {tag.name}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            );
          })}
        </div>
      )}

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-1">
          {categories.map(cat => (
            <Collapsible key={cat} open={openCategories.has(cat)} onOpenChange={() => toggleCategory(cat)}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent/50">
                {CATEGORY_LABELS[cat] || cat}
                <ChevronDown className={cn('w-3 h-3 transition-transform', openCategories.has(cat) && 'rotate-180')} />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-1 pb-1">
                <div className="flex flex-wrap gap-1 pt-1">
                  {tagsByCategory[cat].map(tag => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-all cursor-pointer',
                          isSelected ? 'ring-1 ring-offset-1 ring-offset-background' : 'opacity-70 hover:opacity-100'
                        )}
                        style={{
                          borderColor: tag.color + (isSelected ? '80' : '40'),
                          color: tag.color,
                          backgroundColor: isSelected ? tag.color + '20' : 'transparent',
                          boxShadow: isSelected ? `0 0 0 1px ${tag.color}40` : undefined,
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
