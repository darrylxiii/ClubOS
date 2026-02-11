import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tags, Plus, X, Search } from 'lucide-react';
import { useCandidateTags, TagDefinition } from '@/hooks/useCandidateTags';
import { cn } from '@/lib/utils';

interface CandidateTagManagerProps {
  candidateId: string;
  compact?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  seniority: 'Seniority',
  function: 'Function',
  industry: 'Industry',
  availability: 'Availability',
  quality: 'Quality',
  source: 'Source',
  custom: 'Custom',
};

const CATEGORY_ORDER = ['quality', 'seniority', 'function', 'industry', 'availability', 'source', 'custom'];

export function CandidateTagManager({ candidateId, compact = false }: CandidateTagManagerProps) {
  const { assignedTags, tagsByCategory, loading, assignTag, removeTag } = useCandidateTags(candidateId);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const filteredCategories = CATEGORY_ORDER
    .filter(cat => tagsByCategory[cat]?.length)
    .map(cat => ({
      key: cat,
      label: CATEGORY_LABELS[cat] || cat,
      tags: (tagsByCategory[cat] || []).filter(t =>
        !search || t.name.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(c => c.tags.length > 0);

  if (loading) return null;

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tags className="w-4 h-4" />
            Tags
          </CardTitle>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <div className="p-2 border-b border-border/30">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    placeholder="Search tags..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-7 text-sm"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-3">
                {filteredCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No tags available</p>
                )}
                {filteredCategories.map(({ key, label, tags }) => (
                  <div key={key}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">
                      {label}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => { assignTag(tag.id); setSearch(''); }}
                          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:bg-accent cursor-pointer"
                          style={{ borderColor: tag.color + '40', color: tag.color }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {assignedTags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tags assigned</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {assignedTags.map(({ tag_id, tag }) => (
              <Badge
                key={tag_id}
                variant="outline"
                className="group cursor-default pr-1 text-xs"
                style={{ borderColor: tag.color + '40', color: tag.color, backgroundColor: tag.color + '10' }}
              >
                {tag.name}
                <button
                  onClick={() => removeTag(tag_id)}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
