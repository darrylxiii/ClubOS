import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  currentEmoji?: string | null;
}

const EMOJI_CATEGORIES = {
  'Recent': ['📄', '📝', '📋', '📊', '📈', '💼', '🎯', '✅'],
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'],
  'Objects': ['📄', '📝', '📋', '📊', '📈', '📉', '📁', '📂', '🗂️', '📰', '📑', '🔖', '🏷️', '📌', '📍', '📎'],
  'Work': ['💼', '💻', '🖥️', '⌨️', '🖱️', '📱', '📞', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '🗳️', '✏️'],
  'Symbols': ['✅', '❌', '⭐', '🌟', '💡', '🔥', '💯', '✨', '🎯', '🎉', '🎊', '🏆', '🥇', '🏅', '🎖️', '🏵️'],
  'Nature': ['🌸', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🍀', '🍁', '🍂', '🌿', '☀️', '🌙', '⭐', '🌈'],
  'Food': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🥝', '🍅', '🥑', '🥕', '🌽', '🥦', '🥬'],
  'Travel': ['🚗', '🚕', '🚌', '🏎️', '✈️', '🚀', '🛸', '🚁', '⛵', '🚢', '🏠', '🏢', '🏛️', '🗽', '🗼', '🌍'],
};

export function EmojiPicker({ onSelect, onClose, currentEmoji }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Recent');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const filteredEmojis = search
    ? Object.values(EMOJI_CATEGORIES)
        .flat()
        .filter((emoji) => emoji.includes(search))
    : EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES] || [];

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="bg-card border rounded-lg shadow-xl w-[340px] max-h-[400px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-medium">Choose icon</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emoji..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Categories */}
        {!search && (
          <div className="flex gap-1 p-2 border-b overflow-x-auto">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="shrink-0 text-xs"
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {/* Emoji Grid */}
        <ScrollArea className="h-[200px] p-3">
          <div className="grid grid-cols-8 gap-1">
            {filteredEmojis.map((emoji, index) => (
              <button
                key={`${emoji}-${index}`}
                onClick={() => onSelect(emoji)}
                className={cn(
                  "w-8 h-8 flex items-center justify-center text-xl rounded hover:bg-accent transition-colors",
                  currentEmoji === emoji && "bg-accent ring-2 ring-primary"
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Remove Icon Button */}
        {currentEmoji && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect('')}
              className="w-full text-muted-foreground"
            >
              Remove icon
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
