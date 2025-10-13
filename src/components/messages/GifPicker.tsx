import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, TrendingUp, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
}

const TRENDING_GIFS = [
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
  "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif",
  "https://media.giphy.com/media/26tnjjQQRqPbwDxdK/giphy.gif",
];

export const GifPicker = ({ onSelect }: GifPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<string[]>(TRENDING_GIFS);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchQuery) {
      // Simulate search - in production, integrate with Giphy/Tenor API
      const filtered = TRENDING_GIFS.filter(() => Math.random() > 0.3);
      setGifs(filtered.length > 0 ? filtered : TRENDING_GIFS);
    } else {
      setGifs(TRENDING_GIFS);
    }
  }, [searchQuery]);

  const handleSelect = (gifUrl: string) => {
    onSelect(gifUrl);
    setOpen(false);
    toast.success("GIF added");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="flex-shrink-0 hover:bg-accent/50"
          title="Send GIF"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 glass-card" align="end">
        <div className="p-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search GIFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 glass-subtle border-border/50"
            />
          </div>
        </div>
        <div className="p-2 flex items-center gap-2 text-xs text-muted-foreground border-b border-border/50">
          <TrendingUp className="h-3 w-3" />
          <span>Trending</span>
        </div>
        <ScrollArea className="h-80">
          <div className="grid grid-cols-2 gap-2 p-2">
            {gifs.map((gif, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(gif)}
                className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all hover:scale-105"
              >
                <img
                  src={gif}
                  alt="GIF"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="p-2 border-t border-border/50 text-xs text-center text-muted-foreground">
          Powered by GIPHY
        </div>
      </PopoverContent>
    </Popover>
  );
};
