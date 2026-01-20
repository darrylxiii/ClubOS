import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, X, Tag, Star, Flame, Medal, Briefcase, Users, Check } from 'lucide-react';

interface TalentPoolTagsProps {
  candidateId: string;
  initialTags?: string[];
  editable?: boolean;
  onTagsChange?: (tags: string[]) => void;
  size?: 'sm' | 'md';
}

const PREDEFINED_TAGS = [
  { label: 'Hot Lead', icon: Flame, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  { label: 'Silver Medalist', icon: Medal, color: 'bg-gray-400/10 text-gray-600 border-gray-400/20' },
  { label: 'Future Executive', icon: Star, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  { label: 'Industry Expert', icon: Briefcase, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { label: 'Culture Fit', icon: Users, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { label: 'High Potential', icon: Star, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { label: 'Passive', icon: Tag, color: 'bg-muted text-muted-foreground' },
  { label: 'Active Seeker', icon: Tag, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
];

export function TalentPoolTags({
  candidateId,
  initialTags = [],
  editable = true,
  onTagsChange,
  size = 'md',
}: TalentPoolTagsProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [open, setOpen] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const getTagStyle = (tag: string) => {
    const predefined = PREDEFINED_TAGS.find(t => t.label === tag);
    return predefined?.color || 'bg-muted text-muted-foreground';
  };

  const getTagIcon = (tag: string) => {
    const predefined = PREDEFINED_TAGS.find(t => t.label === tag);
    return predefined?.icon || Tag;
  };

  const saveTags = async (newTags: string[]) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ tags: newTags })
        .eq('id', candidateId);

      if (error) throw error;
      
      setTags(newTags);
      onTagsChange?.(newTags);
    } catch (error) {
      console.error('Error saving tags:', error);
      toast.error('Failed to update tags');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async (tag: string) => {
    if (!tag.trim() || tags.includes(tag)) return;
    
    const newTags = [...tags, tag.trim()];
    await saveTags(newTags);
    setCustomTag('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    await saveTags(newTags);
  };

  const toggleTag = async (tag: string) => {
    if (tags.includes(tag)) {
      await handleRemoveTag(tag);
    } else {
      await handleAddTag(tag);
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] h-5 px-1.5' 
    : 'text-xs h-6 px-2';

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag) => {
        const IconComponent = getTagIcon(tag);
        return (
          <Badge
            key={tag}
            variant="outline"
            className={`${sizeClasses} ${getTagStyle(tag)} ${editable ? 'pr-0.5' : ''}`}
          >
            <IconComponent className={size === 'sm' ? 'h-2.5 w-2.5 mr-0.5' : 'h-3 w-3 mr-1'} />
            {tag}
            {editable && (
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 p-0.5 rounded-full hover:bg-foreground/10"
                disabled={saving}
              >
                <X className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              </button>
            )}
          </Badge>
        );
      })}

      {editable && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`${sizeClasses} gap-1 text-muted-foreground hover:text-foreground`}
              disabled={saving}
            >
              <Plus className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search or create tag..." />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2">
                    <Input
                      placeholder="Create custom tag..."
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customTag) {
                          handleAddTag(customTag);
                          setOpen(false);
                        }
                      }}
                      className="h-8"
                    />
                    {customTag && (
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          handleAddTag(customTag);
                          setOpen(false);
                        }}
                      >
                        Create "{customTag}"
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
                <CommandGroup heading="Predefined Tags">
                  {PREDEFINED_TAGS.map((tag) => {
                    const isSelected = tags.includes(tag.label);
                    const IconComponent = tag.icon;
                    return (
                      <CommandItem
                        key={tag.label}
                        onSelect={() => {
                          toggleTag(tag.label);
                        }}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {tag.label}
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
