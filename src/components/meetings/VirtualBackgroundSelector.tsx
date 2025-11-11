import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Image, Droplets, Check } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_BACKGROUNDS = [
  { id: 'none', name: 'No Background', type: 'none', preview: '/placeholder.svg' },
  { id: 'blur', name: 'Blur Background', type: 'blur', preview: '/placeholder.svg' },
  { id: 'office-1', name: 'Modern Office', type: 'image', preview: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400' },
  { id: 'office-2', name: 'Executive Office', type: 'image', preview: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400' },
  { id: 'library', name: 'Library', type: 'image', preview: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400' },
  { id: 'workspace', name: 'Workspace', type: 'image', preview: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400' },
];

interface VirtualBackgroundSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBackgroundSelect: (background: { type: string; imageUrl?: string }) => void;
}

export function VirtualBackgroundSelector({
  open,
  onOpenChange,
  onBackgroundSelect
}: VirtualBackgroundSelectorProps) {
  const [selectedBg, setSelectedBg] = useState<string>('none');
  const [customBackgrounds, setCustomBackgrounds] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadCustomBackgrounds();
    }
  }, [open]);

  const loadCustomBackgrounds = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('virtual_backgrounds' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomBackgrounds(data || []);
    } catch (error) {
      console.error('Error loading backgrounds:', error);
    }
  };

  const selectBackground = (bg: any) => {
    setSelectedBg(bg.id);
    
    if (bg.type === 'none') {
      onBackgroundSelect({ type: 'none' });
      toast.success('Background removed');
    } else if (bg.type === 'blur') {
      onBackgroundSelect({ type: 'blur' });
      toast.success('Background blur enabled');
    } else {
      onBackgroundSelect({ type: 'image', imageUrl: bg.preview || bg.image_url });
      toast.success('Background applied');
    }
  };

  const allBackgrounds = [...DEFAULT_BACKGROUNDS, ...customBackgrounds];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl z-[10200]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Virtual Backgrounds
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-3 gap-4">
            {allBackgrounds.map((bg) => (
              <Card
                key={bg.id}
                className={`relative cursor-pointer transition-all hover:scale-105 ${
                  selectedBg === bg.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => selectBackground(bg)}
              >
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  {bg.type === 'none' ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <span className="text-4xl">🚫</span>
                    </div>
                  ) : bg.type === 'blur' ? (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 backdrop-blur-xl">
                      <Droplets className="w-12 h-12 text-primary" />
                    </div>
                  ) : (
                    <img
                      src={bg.preview || bg.image_url}
                      alt={bg.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                
                {selectedBg === bg.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                
                <div className="p-2">
                  <p className="text-sm font-medium truncate">{bg.name}</p>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            Upload Custom Background
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}