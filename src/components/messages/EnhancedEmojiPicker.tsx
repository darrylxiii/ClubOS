import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smile, Search, TrendingUp } from "lucide-react";
import { useState } from "react";

const EMOJI_CATEGORIES = {
  frequent: ["😀", "😂", "❤️", "👍", "👎", "🎉", "🔥", "💯", "👏", "🙌"],
  smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋"],
  people: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛"],
  nature: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉"],
  food: ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️"],
  activity: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹"],
  travel: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🦯", "🦽", "🦼", "🛴", "🚲", "🛵", "🏍️", "🛺"],
  objects: ["⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞"],
};

interface EnhancedEmojiPickerProps {
  onSelect: (emoji: string) => void;
  children?: React.ReactNode;
}

export const EnhancedEmojiPicker = ({ onSelect, children }: EnhancedEmojiPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filteredCategories = Object.entries(EMOJI_CATEGORIES).reduce((acc, [category, emojis]) => {
    if (!searchQuery) {
      acc[category] = emojis;
    } else {
      const filtered = emojis.filter(emoji => {
        const query = searchQuery.toLowerCase();
        return emoji.includes(query) || category.toLowerCase().includes(query);
      });
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
    }
    return acc;
  }, {} as Record<string, string[]>);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="flex-shrink-0 hover:bg-accent/50">
            <Smile className="h-5 w-5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass-card" align="end">
        <div className="p-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emoji..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 glass-subtle border-border/50"
            />
          </div>
        </div>
        <Tabs defaultValue="frequent" className="w-full">
          <TabsList className="w-full justify-start border-b border-border/50 rounded-none bg-transparent p-0">
            <TabsTrigger value="frequent" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <TrendingUp className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="smileys" className="rounded-none">😀</TabsTrigger>
            <TabsTrigger value="people" className="rounded-none">👋</TabsTrigger>
            <TabsTrigger value="nature" className="rounded-none">🐶</TabsTrigger>
            <TabsTrigger value="food" className="rounded-none">🍎</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-none">⚽</TabsTrigger>
            <TabsTrigger value="travel" className="rounded-none">🚗</TabsTrigger>
            <TabsTrigger value="objects" className="rounded-none">⌚</TabsTrigger>
          </TabsList>
          {Object.entries(filteredCategories).map(([category, emojis]) => (
            <TabsContent key={category} value={category} className="mt-0">
              <ScrollArea className="h-64">
                <div className="grid grid-cols-8 gap-1 p-2">
                  {emojis.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelect(emoji)}
                      className="text-2xl h-10 w-10 p-0 hover:bg-accent/50 transition-all hover:scale-110"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
